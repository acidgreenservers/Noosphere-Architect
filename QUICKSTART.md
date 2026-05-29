# Quickstart ⚡

Get from **clone → running app** in 90 seconds.

## Prerequisites

- **Node.js** >= 20.x
- **OpenRouter API Key** (for generation)

## 1) Clone & Install

```bash
git clone https://github.com/acidgreenservers/Noosphere-Architect.git
cd Noosphere-Architect
npm install
```

## 2) Environment Setup

```bash
cp .env.example .env
# Optional: Set VITE_ENCRYPTION_KEY in .env for data-at-rest obfuscation
```

## 3) Launch

```bash
npm run dev
```

Open **[http://localhost:3000/Noosphere-Architect/](http://localhost:3000/Noosphere-Architect/)**
in your browser.

## 4) Activate AI

1. Click the **Gear Icon** (Settings) in the top nav.
2. Paste your **OpenRouter API Key**.
3. Select a model (e.g., `deepseek/deepseek-chat`).
4. Click **Signal Extractor** to start with your first messy thought.

---

### Deeper Dives

- **Full Setup:** [README.md](./README.md)
- **Technical Design:** [ARCHITECTURE.md](./ARCHITECTURE.md)
- **Security Posture:** [SECURITY.md](./SECURITY.md)
