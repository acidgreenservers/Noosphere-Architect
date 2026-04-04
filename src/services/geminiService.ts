
import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import { AgentConfig, GeneratedFiles, PromptConfig, ProjectConfig, GeneratedProjectFiles } from '../types';
import { getOpenRouterKey, getOpenRouterModel } from './sessionService';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable is not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const getOpenRouterConfig = () => {
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

const callOpenRouter = async (prompt: string, apiKey: string, model: string, expectJson: boolean = false): Promise<string> => {
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

const createAgentFilesMetaPrompt = (config: AgentConfig): string => {
  return `
You are an expert AI Systems Architect. Your task is to take a user's high-level agent configuration and generate a set of comprehensive, structured project files.

The final output MUST be a single, raw JSON object with no surrounding text or markdown code blocks. The JSON object must have four keys: "agentFile", "projectGuidelines", "constraintsFile", and "skillFile". Each key's value must be a string containing the full content of the respective file in Markdown format.

**User's Agent Configuration:**
- **Role:** ${config.role}
- **Scope:** ${config.scope}
- **Primary Goals:** ${config.goals || 'Not specified'}
- **Constraints & Guardrails:** ${config.constraints || 'Not specified'}

---

**Detailed File Generation Instructions:**

1.  **agentFile (Markdown String):**
    - Create a detailed agent persona based on the provided Role.
    - Define its primary functions and responsibilities based on the Scope.
    - List its core capabilities and skills.
    - Specify a suitable communication style and tone.

2.  **projectGuidelines (Markdown String):**
    - Formulate a clear project mission statement from the Scope and Goals.
    - Outline key objectives and success metrics based on the agent's Goals.
    - Describe the target audience and user interaction model.
    - Provide high-level technical and design principles relevant to the project.

3.  **constraintsFile (Markdown String):**
    - Detail the operational boundaries and limitations (the 'guardrails').
    - List any ethical considerations or restricted topics implied by the configuration.
    - Specify any technical constraints or dependencies that might be relevant.
    - Directly include any user-provided constraints.

4.  **skillFile (Markdown String):**
    - Create a "SKILL.md" file that follows the "Skill Creator" anatomy.
    - **Frontmatter (YAML):** Must include "name" (hyphenated-lowercase-name) and "description" (comprehensive triggering description).
    - **Body (Markdown):** Provide clear, concise instructions for an AI agent to execute the tasks defined in the Scope and Goals.
    - Use the following "Skill Creator" principles:
        - Concise is Key: Only add context the agent doesn't already have.
        - Set Appropriate Degrees of Freedom: Match specificity to task fragility.
        - Anatomy: YAML frontmatter + Markdown body.
        - Progressive Disclosure: Keep the body essential and under 500 lines.
    - The skillFile should be a standalone "onboarding guide" for this specific agent's domain.

Generate ONLY the raw JSON object as described.
  `;
};

export const generateAgentFiles = async (config: AgentConfig): Promise<GeneratedFiles> => {
  const prompt = createAgentFilesMetaPrompt(config);

  try {
    const openRouterConfig = getOpenRouterConfig();
    
    if (openRouterConfig) {
      const responseText = await callOpenRouter(prompt, openRouterConfig.apiKey, openRouterConfig.model, true);
      // Clean up potential markdown code blocks from OpenRouter response
      const cleanedText = responseText.replace(/^```json\n?/, '').replace(/\n?```$/, '');
      return JSON.parse(cleanedText);
    }

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            agentFile: { type: Type.STRING },
            projectGuidelines: { type: Type.STRING },
            constraintsFile: { type: Type.STRING },
            skillFile: { type: Type.STRING },
          },
          required: ['agentFile', 'projectGuidelines', 'constraintsFile', 'skillFile'],
        },
        temperature: 0.7,
      },
    });

    if (response.text) {
        const jsonString = response.text;
        const parsedResult: GeneratedFiles = JSON.parse(jsonString);
        return parsedResult;
    } else {
        throw new Error("Received an empty response from the API.");
    }
  } catch (error: any) {
    console.error("Error generating agent files:", error);
    throw new Error(error.message || "Failed to communicate with the API.");
  }
};

const createStructuredPromptMetaPrompt = (config: PromptConfig) => `
You are an expert Prompt Engineering Assistant. Your task is to take a user's raw goal and key instructions and transform them into a well-structured, clear, and highly effective system prompt.

The final prompt you generate should be detailed, unambiguous, and ready for another AI to use. Structure the output using clear headings in Markdown format (e.g., ### ROLE, ### TASK).

User's raw input:
- **Core Task/Goal:** ${config.goal}
- **Key Instructions/Constraints:** ${config.instructions || 'None provided.'}

Based on the user's input, create a comprehensive system prompt. If the user provides specific instructions, incorporate them directly into the relevant sections. If parts are unspecified, use your expertise to add logical details or create sections that would make the prompt more robust (like suggesting an output format if not given).

A good structure often includes:
- **### ROLE AND GOAL:** Define the AI's persona and its primary objective.
- **### CONTEXT:** Provide any necessary background information.
- **### STEP-BY-STEP INSTRUCTIONS:** A clear sequence of actions for the AI to follow.
- **### CONSTRAINTS:** Rules, limitations, and things to avoid.
- **### OUTPUT FORMAT:** Specify how the final output should be formatted (e.g., JSON, Markdown, a list).

Generate ONLY the final, structured prompt. Do not include any conversational text or explanations about what you did.
`;


export const generateStructuredPrompt = async (config: PromptConfig): Promise<string> => {
  if (!config.goal.trim()) {
    throw new Error("Prompt goal cannot be empty.");
  }
  
  const metaPrompt = createStructuredPromptMetaPrompt(config);

  try {
    const openRouterConfig = getOpenRouterConfig();
    
    if (openRouterConfig) {
      return await callOpenRouter(metaPrompt, openRouterConfig.apiKey, openRouterConfig.model, false);
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: metaPrompt,
      config: {
        temperature: 0.6,
      },
    });

    if (response.text) {
      return response.text;
    } else {
      throw new Error("Received an empty response from the API.");
    }
  } catch (error: any) {
    console.error("Error generating structured prompt:", error);
    throw new Error(error.message || "Failed to communicate with the API.");
  }
};

const createProjectFilesMetaPrompt = (config: ProjectConfig): string => {
  return `
You are a top-tier Project Management AI. Your task is to take a user's high-level project definition and generate a set of three comprehensive, structured project documents.

The final output MUST be a single, raw JSON object with no surrounding text or markdown code blocks. The JSON object must have three keys: "overviewFile", "standardsFile", and "rulesFile". Each key's value must be a string containing the full content of the respective file in Markdown format.

**User's Project Configuration:**
- **Title:** ${config.title}
- **Idea:** ${config.idea}
- **Vision:** ${config.vision}
- **Goal:** ${config.goal}
- **Rules:** ${config.rules}
- **Constraints:** ${config.constraints}
- **Guidelines:** ${config.guidelines}
- **Developer Roles:** ${config.roles}
- **Standards:** ${config.standards}
- **Consistency:** ${config.consistency}

---

**Detailed File Generation Instructions:**

1.  **overviewFile (Markdown String):**
    - **Project Title:** Start with the project title as a main heading.
    - **Executive Summary:** Synthesize the Idea, Vision, and Goal into a concise executive summary.
    - **Project Vision:** A detailed section on the long-term vision.
    - **Core Goals & Objectives:** A bulleted list of the primary, measurable goals.

2.  **standardsFile (Markdown String):**
    - **Team Roles & Responsibilities:** Based on the developer roles, create a section defining each role's responsibilities.
    - **Development Standards:** Elaborate on the project standards. This could include code style, testing practices, and commit message formats.
    - **Consistency Guidelines:** Detail the rules for maintaining project consistency across the codebase and documentation.

3.  **rulesFile (Markdown String):**
    - **General Project Rules:** A numbered list of the core project rules.
    - **Operational Constraints:** Detail the hard constraints and limitations.
    - **Project Guardrails & Guidelines:** Elaborate on the guidelines, providing a clear set of best practices and safety measures.

Generate ONLY the raw JSON object as described.
  `;
};

export const generateProjectFiles = async (config: ProjectConfig): Promise<GeneratedProjectFiles> => {
  const prompt = createProjectFilesMetaPrompt(config);

  try {
    const openRouterConfig = getOpenRouterConfig();
    
    if (openRouterConfig) {
      const responseText = await callOpenRouter(prompt, openRouterConfig.apiKey, openRouterConfig.model, true);
      // Clean up potential markdown code blocks from OpenRouter response
      const cleanedText = responseText.replace(/^```json\n?/, '').replace(/\n?```$/, '');
      return JSON.parse(cleanedText);
    }

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            overviewFile: { type: Type.STRING },
            standardsFile: { type: Type.STRING },
            rulesFile: { type: Type.STRING },
          },
          required: ['overviewFile', 'standardsFile', 'rulesFile'],
        },
        temperature: 0.7,
      },
    });

    if (response.text) {
        const jsonString = response.text;
        return JSON.parse(jsonString);
    } else {
        throw new Error("Received an empty response from the API.");
    }
  } catch (error: any) {
    console.error("Error generating project files:", error);
    throw new Error(error.message || "Failed to communicate with the API.");
  }
};
