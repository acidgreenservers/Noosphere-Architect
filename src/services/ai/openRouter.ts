import { getOpenRouterKey, getOpenRouterModel } from '../sessionService';

export const getOpenRouterConfig = () => {
  const apiKey = getOpenRouterKey();
  const model = getOpenRouterModel();

  if (apiKey && model) {
    return { apiKey, model };
  } else if (apiKey && !model) {
    throw new Error("OpenRouter API key is set, but no model is specified. Please configure both in settings.");
  } else if (!apiKey && model) {
    throw new Error("OpenRouter model is set, but no API key is specified. Please configure both in settings.");
  }

  return null;
};

export interface AiCallOptions {
  systemPrompt?: string;
  maxTokens?: number;
  validator?: (parsedData: any) => void;
}

/**
 * Raw fetch to OpenRouter. Accepts an optional AbortSignal for cancellation.
 */
export const callOpenRouter = async (
  prompt: string,
  apiKey: string,
  model: string,
  expectJson: boolean = false,
  signal?: AbortSignal,
  options?: AiCallOptions
): Promise<string> => {
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(new Error("Request timed out after 45 seconds")), 45000);

  const combinedSignal = signal ? AbortSignal.any([signal, timeoutController.signal]) : timeoutController.signal;

  try {
    const messages = [];
    if (options?.systemPrompt) {
      messages.push({ role: "system", content: options.systemPrompt });
    }
    messages.push({ role: "user", content: prompt });

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      signal: combinedSignal,
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": (!window.location.origin || window.location.origin === "null" || window.location.origin.includes("localhost") || window.location.origin.includes("file://")) ? "https://noosphere-architect.local" : window.location.origin,
        "X-Title": "Noosphere Architect",
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        max_tokens: options?.maxTokens || 8192,
        response_format: expectJson ? { type: "json_object" } : undefined,
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: { message: `HTTP ${response.status}` } }));
      const error = new Error(err.error?.message || `OpenRouter API error (${response.status})`);
      (error as any).status = response.status;
      throw error;
    }

    const data = await response.json();
    if (!data || !data.choices || !Array.isArray(data.choices) || data.choices.length === 0 || !data.choices[0]?.message) {
      const errorStr = JSON.stringify(data).slice(0, 150);
      const error = new Error(`Invalid response format from OpenRouter: ${errorStr}`);
      (error as any).status = 502; // Treat malformed payload as a Bad Gateway to trigger retry
      throw error;
    }
    return data.choices[0].message.content || "";
  } finally {
    clearTimeout(timeoutId);
  }
};

/**
 * Retryable status codes: rate-limit (429) and server errors (502, 503, 504).
 */
const RETRYABLE_STATUSES = new Set([429, 502, 503, 504]);
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

/**
 * AbortError class for typed catching downstream.
 * Components can check `err.name === 'AbortError'` to silently swallow.
 */
export class AbortError extends Error {
  constructor() {
    super('Request was aborted');
    this.name = 'AbortError';
  }
}

export const handleAiCall = async <T>(
  prompt: string,
  expectJson: boolean,
  errorContext: string,
  signal?: AbortSignal,
  options?: AiCallOptions
): Promise<T> => {
  const config = getOpenRouterConfig();

  if (!config) {
    throw new Error("OpenRouter settings (API Key and Model) are required. Please configure them in the Agent API Settings.");
  }

  let lastError: any = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const responseText = await callOpenRouter(
        prompt,
        config.apiKey,
        config.model,
        expectJson,
        signal,
        options
      );

      if (expectJson) {
        // Robust JSON extraction: Strip markdown code blocks or extract JSON structure via regex
        let cleanedText = responseText.trim();
        
        // Remove leading/trailing markdown fences if present
        cleanedText = cleanedText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

        // If text still contains non-JSON markdown wrapper, extract first JSON object or array
        const jsonMatch = cleanedText.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
        if (jsonMatch) {
          cleanedText = jsonMatch[0];
        }

        try {
          const parsed = JSON.parse(cleanedText);
          if (options?.validator) {
            options.validator(parsed); // Throws if invalid
          }
          return parsed as T;
        } catch (parseErr: any) {
          const errorStr = responseText.slice(0, 200);
          const error = new Error(`AI response was not valid. ${parseErr.message || ''}. Raw: ${errorStr}`);
          (error as any).status = 502; // Treat malformed JSON as a Bad Gateway to trigger retry
          throw error;
        }
      }

      return responseText as unknown as T;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new AbortError(); // Custom abort error for components to swallow
      }

      lastError = err;
      const status = (err as any)?.status;
      
      const isNetworkError = err.name === 'TypeError' || (err.message && err.message.toLowerCase().includes('fetch'));

      if ((status && RETRYABLE_STATUSES.has(status)) || isNetworkError) {
        if (attempt < MAX_RETRIES) {
          const delay = BASE_DELAY_MS * Math.pow(2, attempt) + Math.random() * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }

      break;
    }
  }

  console.error(`Error ${errorContext}:`, lastError);
  throw new Error(lastError?.message || "Failed to communicate with the API.");
};