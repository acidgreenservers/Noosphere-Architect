
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

export const callOpenRouter = async (prompt: string, apiKey: string, model: string, expectJson: boolean = false): Promise<string> => {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: model,
      messages: [{ role: "user", content: prompt }],
      response_format: expectJson ? { type: "json_object" } : undefined,
    })
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || "OpenRouter API error");
  }

  const data = await response.json();
  return data.choices[0].message.content;
};

/**
 * Shared utility to handle AI calls with standardized error handling and JSON cleaning.
 */
export const handleAiCall = async <T>(
  prompt: string,
  expectJson: boolean,
  errorContext: string
): Promise<T> => {
  try {
    const config = getOpenRouterConfig();

    if (!config) {
      throw new Error("OpenRouter settings (API Key and Model) are required. Please configure them in the Agent API Settings.");
    }

    const responseText = await callOpenRouter(prompt, config.apiKey, config.model, expectJson);

    if (expectJson) {
      // Clean up potential markdown code blocks from OpenRouter response
      const cleanedText = responseText.replace(/^```json\n?/, '').replace(/\n?```$/, '');
      return JSON.parse(cleanedText) as T;
    }

    return responseText as unknown as T;
  } catch (error: any) {
    console.error(`Error ${errorContext}:`, error);
    throw new Error(error.message || "Failed to communicate with the API.");
  }
};
