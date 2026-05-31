import { AgentJobConfig, GeneratedAgentJobFile } from '../../types';
import { handleAiCall } from './openRouter';
import { getCustomContext } from '../dbService';

const createAgentJobMetaPrompt = (config: AgentJobConfig, customContext?: string): string => {
  const contextPrefix = customContext ? `**CUSTOM SYSTEM CONTEXT:**\n${customContext}\n\n---\n\n` : "";

  const prompt = `${contextPrefix}You are writing an internal employer handbook document that an AI agent-employee reads to understand their job within the project workplace.

Your voice is that of the organization itself — authoritative but not cold. You instruct and teach in equal measure. You compress complex ideas into short, leading sentences that carry weight. You use metaphor and high-level compression when something is too large to explain in detail, synthesizing the smaller parts into a coherent, flowing whole.

The output should read like a job description written from the perspective of the employer to the employee — not a technical spec, but a living document that orients, empowers, and sets clear boundaries. It balances clarity with presence. It does not need to be long to be complete.

Generate a single AGENTS.md file in Markdown format with YAML frontmatter. Use the following structure:

---
Anchor: [A single sentence that grounds the agent's purpose — extracted from the mission]
Role: ${config.jobTitle}
Goal: [What this role ultimately exists to accomplish — one sentence]
Function: [What this role does day-to-day, compressed]
Creativity: [How much latitude the agent has — inferred from authority level]
Responsibility: [The weight of the role — what they own]
Security Design Philosophy: [How the role approaches safety and boundaries]
---

# JOB DESCRIPTION: ${config.jobTitle}

> [A powerful orienting quote or statement that sets the tone — distilled from the mission]

## Your Role

**Department:** ${config.department || 'Not specified'}
**Reports To:** ${config.reportsTo || 'Not specified'}

## Your Mission

${config.mission}

## Key Responsibilities

[Write 4-6 flowing, prose-style responsibility statements. Each should be a paragraph that teaches as much as it instructs. Use metaphorical compression where helpful. Do not use bullet lists — use short paragraphs.]

## What You Need To Know

[From qualifications — write 2-3 paragraphs that describe the knowledge and capability the agent should embody.]

## How You Operate

[From operating principles — write 3-4 paragraphs describing the conduct, values, and ethos. This is the character section. Compress values into memorable phrases.]

## Your Authority

[From authority field — what the agent decides autonomously, written as empowering prose with clear edges.]

## When To Escalate

[From escalation path — written as guidance, not just rules. What situations call for human judgment?]

## How Success Is Measured

[From success criteria — written as a set of observable outcomes that signal the role is being fulfilled well.]

## Boundaries

[From constraints — what is off-limits. Written as firm but respectful edges.]

---

**User's Job Configuration:**
- **Job Title:** ${config.jobTitle}
- **Department:** ${config.department}
- **Reports To:** ${config.reportsTo}
- **Mission:** ${config.mission}
- **Responsibilities:** ${config.responsibilities}
- **Qualifications:** ${config.qualifications}
- **Operating Principles:** ${config.operatingPrinciples}
- **Authority:** ${config.authority}
- **Escalation Path:** ${config.escalationPath}
- **Success Criteria:** ${config.successCriteria}
- **Constraints:** ${config.constraints}

Generate ONLY the AGENTS.md file content as a plain Markdown string. Do not wrap it in code blocks. Do not add extra commentary.`;

  return prompt;
};

export const generateAgentJobFile = async (config: AgentJobConfig, signal?: AbortSignal): Promise<GeneratedAgentJobFile> => {
  const customContext = await getCustomContext('projectContext');
  const prompt = createAgentJobMetaPrompt(config, customContext);
  const content = await handleAiCall<string>(prompt, false, "generating agent job description", signal);
  return { agentsFile: content };
};