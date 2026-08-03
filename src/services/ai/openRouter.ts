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

/**
 * Raw fetch to OpenRouter. Accepts an optional AbortSignal for cancellation.
 */
export const callOpenRouter = async (
  prompt: string,
  apiKey: string,
  model: string,
  expectJson: boolean = false,
  signal?: AbortSignal
): Promise<string> => {
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(new Error("Request timed out after 45 seconds")), 45000);

  const combinedSignal = signal ? AbortSignal.any([signal, timeoutController.signal]) : timeoutController.signal;

  try {
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
        messages: [{ role: "user", content: prompt }],
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

async function callOpenRouterWithRetry(
  prompt: string,
  apiKey: string,
  model: string,
  expectJson: boolean,
  signal?: AbortSignal
): Promise<string> {
  let lastError: any = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await callOpenRouter(prompt, apiKey, model, expectJson, signal);
    } catch (err: any) {
      // If the request was aborted, don't retry — just propagate
      if (err.name === 'AbortError') {
        throw err;
      }

      lastError = err;
      const status = (err as any)?.status;
      
      // Network disconnects/CORS failures usually throw TypeError: Failed to fetch without a status code
      const isNetworkError = err.name === 'TypeError' || (err.message && err.message.toLowerCase().includes('fetch'));

      if ((status && RETRYABLE_STATUSES.has(status)) || isNetworkError) {
        if (attempt < MAX_RETRIES) {
          const delay = BASE_DELAY_MS * Math.pow(2, attempt) + Math.random() * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }

      // Non-retryable or retries exhausted
      break;
    }
  }

  throw lastError;
}

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

/**
 * Shared utility to handle AI calls with standardized error handling, JSON cleaning,
 * cancellation support, and automatic retry for transient failures.
 */
export const handleAiCall = async <T>(
  prompt: string,
  expectJson: boolean,
  errorContext: string,
  signal?: AbortSignal
): Promise<T> => {
  try {
    const config = getOpenRouterConfig();

    if (!config) {
      throw new Error("OpenRouter settings (API Key and Model) are required. Please configure them in the Agent API Settings.");
    }

    const responseText = await callOpenRouterWithRetry(
      prompt,
      config.apiKey,
      config.model,
      expectJson,
      signal
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
        return JSON.parse(cleanedText) as T;
      } catch (parseErr) {
        console.error("Failed to parse JSON response:", cleanedText, parseErr);
        throw new Error("AI response was not in a valid JSON format. Raw output: " + responseText.slice(0, 200));
      }
    }

    return responseText as unknown as T;
  } catch (error: any) {
    // If it's an abort, rethrow as typed AbortError
    if (error.name === 'AbortError') {
      throw new AbortError();
    }

    console.error(`Error ${errorContext}:`, error);
    throw new Error(error.message || "Failed to communicate with the API.");
  }
};