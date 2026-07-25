# Noosphere-Architect <small>— Prompting Across Substrates</small> 📘

[![Deploy to GitHub Pages](https://github.com/acidgreenservers/Noosphere-Architect/actions/workflows/deploy.yml/badge.svg)](https://github.com/acidgreenservers/Noosphere-Architect/actions/workflows/deploy.yml)
[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
![Node Version](https://img.shields.io/badge/node-%3E%3D20.x-green)
![Vite](https://img.shields.io/badge/Vite-6.x-646CFF?logo=vite)
![React](https://img.shields.io/badge/React-19.x-61DAFB?logo=react)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.x-06B6D4?logo=tailwindcss)

**Noosphere-Architect** is a sophisticated web application designed to architect
high-quality AI prompts and agent configurations. It provides a suite of tools
to transform raw ideas into structured, actionable assets for any AI model or
substrate, accelerating the path from concept to code.

---

## 🚀 Getting Started

> The commands below are verified for this repo. If your platform differs, see
> **Troubleshooting**.

### Prerequisites

* **Node.js:** >= 20.x
* **npm:** (included with Node)
* **OpenRouter API Key:** Required for AI generation features.

### 1) Setup

```bash
git clone https://github.com/acidgreenservers/Noosphere-Architect.git
cd Noosphere-Architect
npm install
```

### 2) Environment

Copy the example environment file and set your encryption key. This key is used
for obfuscating data at rest in IndexedDB.

```bash
cp .env.example .env
# Edit .env and set VITE_ENCRYPTION_KEY to a secure random string
```

### 3) Run (Local)

```bash
npm run dev
```

The application will be available at `http://localhost:3000/Noosphere-Architect/`.

### 4) Configure AI

Once the app is running:

1. Navigate to **Agent API Settings** (gear icon).
2. Enter your **OpenRouter API Key**.
3. Select a curated model (e.g., DeepSeek, OpenAI, etc.).
4. Start architecting!

---

## 🛠️ The Architect's Toolbox

<details>
<summary>Signal Extractor (Extract & Amplify)</summary>

Extract and amplify the core signal from messy thoughts or rough notes to create
actionable systemic prompts.
</details>

<details>
<summary>MindSeed Architect (Compressive Wisdom)</summary>

Compress text into generative "Seeds of Wisdom" (CogniSeeds, LinguaSeeds,
ArchSeeds) using strict structural integrity checks (Compression, Generative,
Falsifiable, Decompressible).
</details>

<details>
<summary>Prompt & Skill Architect (Dual-Tabbed Precision)</summary>

* **Standard Prompt:** Refine messy thoughts into high-density reasoning
  prompts.
* **Skill Architect:** Generate 4-file bundles (Persona, Guidelines,
  Constraints, Skills) for specialized agent roles.

</details>

<details>
<summary>AI Agent Architect (Declarative Blueprints)</summary>

Define an AI agent's role, scope, and goals to generate a single, powerful,
reasoning-encoded system prompt.
</details>

<details>
<summary>Project Architect (Systemic Alignment)</summary>

Establish a high-level vision, standards, and rules for your project. This tool
serves as a multi-tabbed hub containing:

* **Project Architect:** Define the core identity, architecture, and security
  posture (outputs `PROJECT.md`, `ARCHITECTURE.md`, `SECURITY.md`).
* **Roadmap Architect:** Transform vision text into actionable, detailed roadmap
  tasks.
* **Agent Job Architect:** Author an employer handbook for AI agent-employees,
  defining their role, authority, and operating boundaries.

</details>

<details>
<summary>Architecture Organization (Central Command)</summary>

Manage, categorize (star, pin, archive), and steward all architectural assets
under a unified metadata schema. Synthesize new insights using the
**Synthesis Workspace**.
</details>

---

## 🏗️ Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the ASCII blueprint and component
interactions.

## ⚙️ Configuration

| Key | Description | Default |
| :--- | :--- | :--- |
| `VITE_ENCRYPTION_KEY` | Key for IndexedDB obfuscation | (required) |

## 🧪 Testing & Quality

```bash
npm test            # Run Vitest unit tests
npm run test:e2e    # Run Playwright E2E tests (requires dev server running)
npm run lint        # TypeScript check
```

## 🔒 Security

See [SECURITY.md](./SECURITY.md) for reporting vulnerabilities and our security
posture.

## 🧩 Contributing

1. Fork the repository.
2. Create a feature branch.
3. Ensure tests pass (`npm test`).
4. Submit a PR.

## 📄 License

This project is licensed under the **GNU Affero General Public License v3.0
(AGPL-3.0)**. See the [LICENSE](./LICENSE) file for details.

---

Built with 🧠 and ⚛️ by [acidgreenservers](https://github.com/acidgreenservers).
