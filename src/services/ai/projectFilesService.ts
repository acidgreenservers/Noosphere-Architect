import { ProjectConfig, GeneratedProjectFiles } from '../../types';
import { handleAiCall } from './openRouter';
import { getCustomContext } from '../dbService';

const getFileContextPrefix = (config: ProjectConfig): string => {
  if (!config.fileContext?.content) return "";
  const fileName = config.fileContext.name;
  const content = config.fileContext.content;
  return `**ADDITIONAL FILE CONTEXT (${fileName}):**\n${content}\n\n---\n\n`;
};

/**
 * Generate PROJECT.md — the project's core identity document.
 * Synthesizes title, idea, vision, goal, target audience, and guiding principles.
 */
const generateProjectMd = async (config: ProjectConfig, customContext: string | undefined, signal?: AbortSignal): Promise<string> => {
  const contextPrefix = customContext ? `**CUSTOM SYSTEM CONTEXT:**\n${customContext}\n\n---\n\n` : "";
  const filePrefix = getFileContextPrefix(config);
  const prompt = `${contextPrefix}${filePrefix}You are a senior technical writer crafting a top-level PROJECT.md document for a software project. This document sits at the project root and serves as the authoritative reference for the project's identity, purpose, and direction.

Write in clear, confident prose. Synthesize the provided fields into a cohesive document. Use markdown formatting. Do not use bullet lists for key sections — write in short, flowing paragraphs.

**Project Configuration:**
- **Title:** ${config.title}
- **Idea:** ${config.idea}
- **Vision:** ${config.vision}
- **Goal:** ${config.goal}
- **Target Audience:** ${config.targetAudience}
- **Guiding Principles:** ${config.guidingPrinciples}
- **Key Constraints:** ${config.keyConstraints}
- **Success Criteria:** ${config.successCriteria}

Structure the document as follows:

# ${config.title}

> [One-line tagline synthesized from the goal and idea]

## Mission & Purpose

[Why this project exists — the problem it solves. Synthesize from the idea and goal.]

## Vision

[The future state this project enables. From the vision field, expanded into a compelling paragraph.]

## Core Goals

[2-3 short paragraph statements of measurable objectives. From the goal field.]

## Target Audience

[Who this project serves. From the target audience field.]

## Guiding Principles

[Values and philosophy that shape decisions. From guiding principles, written as confident statements.]

## Key Constraints

[Boundaries and non-negotiables the project respects. From key constraints.]

## Success Criteria

[How the project measures its own success. From success criteria.]

Generate ONLY the PROJECT.md content as a plain Markdown string. Do not wrap in code blocks.`;
  return handleAiCall<string>(prompt, false, "generating PROJECT.md", signal);
};

/**
 * Generate ARCHITECTURE.md — the project's technical foundation document.
 * Synthesizes techStack, architecture, guiding principles, and constraints.
 */
const generateArchitectureMd = async (config: ProjectConfig, customContext: string | undefined, signal?: AbortSignal): Promise<string> => {
  const contextPrefix = customContext ? `**CUSTOM SYSTEM CONTEXT:**\n${customContext}\n\n---\n\n` : "";
  const filePrefix = getFileContextPrefix(config);
  const prompt = `${contextPrefix}${filePrefix}You are a senior software architect writing an ARCHITECTURE.md document. This document describes the technical foundation, structural decisions, and patterns of a project.

Write in clear, authoritative prose. Use markdown formatting. Do not use bullet lists for key sections — write in short, flowing paragraphs that teach as much as they document.

**Project Configuration:**
- **Title:** ${config.title}
- **Tech Stack / Framework:** ${config.techStack}
- **Architecture:** ${config.architecture}
- **Guiding Principles:** ${config.guidingPrinciples}
- **Key Constraints:** ${config.keyConstraints}
- **Security Position:** ${config.securityPosition}
- **Accessibility Position:** ${config.accessibilityPosition}

Structure the document as follows:

# Architecture — ${config.title}

> [One-line architectural identity statement]

## Overview

[High-level summary of the system's structural approach. Synthesize from architecture and techStack.]

## Tech Stack

[The technologies powering this project. From techStack — written as a narrative paragraph, not a list.]

## Architecture Approach

[The patterns and structural decisions. From architecture — describe the system organization, deployment model, key design choices.]

## Design Principles

[From guiding principles — how these values manifest in the architecture.]

## Security Architecture

[From security position — how security shapes the architecture. Key controls, boundaries, compliance considerations.]

## Accessibility Considerations

[From accessibility position — how inclusive design is embedded in the architecture.]

## Constraints & Trade-offs

[From key constraints — what shaped the architecture and what was intentionally traded off.]

Generate ONLY the ARCHITECTURE.md content as a plain Markdown string. Do not wrap in code blocks.`;
  return handleAiCall<string>(prompt, false, "generating ARCHITECTURE.md", signal);
};

/**
 * Generate SECURITY.md — the project's security posture document.
 * Synthesizes securityPosition, techStack, keyConstraints, and accessibilityPosition.
 */
const generateSecurityMd = async (config: ProjectConfig, customContext: string | undefined, signal?: AbortSignal): Promise<string> => {
  const contextPrefix = customContext ? `**CUSTOM SYSTEM CONTEXT:**\n${customContext}\n\n---\n\n` : "";
  const filePrefix = getFileContextPrefix(config);
  const prompt = `${contextPrefix}${filePrefix}You are a security engineer writing a SECURITY.md document for a software project. This document communicates the security posture, practices, and expectations to everyone who works on or with the project.

Write in clear, measured prose. Use markdown formatting. Do not use bullet lists for key sections — write in short, flowing paragraphs that build confidence through clarity.

**Project Configuration:**
- **Title:** ${config.title}
- **Security Position:** ${config.securityPosition}
- **Tech Stack / Framework:** ${config.techStack}
- **Key Constraints:** ${config.keyConstraints}
- **Accessibility Position:** ${config.accessibilityPosition}
- **Goal:** ${config.goal}

Structure the document as follows:

# Security — ${config.title}

> [One-line security posture statement]

## Security Philosophy

[How this project approaches security — from security position, written as a guiding narrative.]

## Trust Boundaries

[Where data crosses trust boundaries. Key controls and verification points.]

## Dependencies & Supply Chain

[How dependencies are managed and verified. From techStack — language ecosystem risks and mitigations.]

## Data Protection

[How data is handled, stored, and transmitted. Encryption, access control principles.]

## Compliance & Standards

[Regulatory and standards alignment. From security position — compliance requirements and audit approach.]

## Secure Development

[Practices for developers working on this project. From guiding principles and constraints — testing, review, secrets management.]

## Incident Response

[How security incidents are handled. Escalation path, communication, remediation approach.]

Generate ONLY the SECURITY.md content as a plain Markdown string. Do not wrap in code blocks.`;
  return handleAiCall<string>(prompt, false, "generating SECURITY.md", signal);
};

/**
 * Generate all three project files sequentially, allowing per-file progress tracking.
 * @returns The three generated files
 * @param onStageComplete Optional callback invoked after each file is generated with the stage index (0, 1, 2)
 */
export const generateProjectFiles = async (
  config: ProjectConfig,
  signal?: AbortSignal,
  onStageComplete?: (stageIndex: number) => void
): Promise<GeneratedProjectFiles> => {
  const customContext = await getCustomContext('projectContext');

  const overviewFile = await generateProjectMd(config, customContext, signal);
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  onStageComplete?.(0);

  const standardsFile = await generateArchitectureMd(config, customContext, signal);
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  onStageComplete?.(1);

  const rulesFile = await generateSecurityMd(config, customContext, signal);
  onStageComplete?.(2);

  return { overviewFile, standardsFile, rulesFile };
};