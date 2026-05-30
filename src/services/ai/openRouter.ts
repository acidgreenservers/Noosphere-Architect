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
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    signal,
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": window.location.origin,
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
  return data.choices[0].message.content;
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

      if (status && RETRYABLE_STATUSES.has(status)) {
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
      // Clean up potential markdown code blocks from OpenRouter response
      const cleanedText = responseText.replace(/^```json\n?/, '').replace(/\n?```$/, '');
      return JSON.parse(cleanedText) as T;
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