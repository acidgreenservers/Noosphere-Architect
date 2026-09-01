# Quickstart ⚡

This path gets you from **clone → running app** in 90 seconds.

## Prerequisites

* **Node.js** >= 20.x
* **npm** (included with Node)
* **OpenRouter API Key** (for generation)

> 💡 **Stack Note:** Noosphere-Architect is a 100% client-side React Single Page Application (SPA). Python or Docker/Compose environments are **not** required to run or develop this project.

## 1) Clone & Enter

```bash
git clone https://github.com/acidgreenservers/Noosphere-Architect.git
cd Noosphere-Architect
```

## 2) Install & Env

```bash
npm install
cp .env.example .env
# Set VITE_ENCRYPTION_KEY in .env (required for persistence)
```

## 3) Launch

```bash
npm run dev
```

## 4) Default URL

App: **[http://localhost:3000/Noosphere-Architect/](http://localhost:3000/Noosphere-Architect/)**

## 5) Verify

```bash
npm test
```

For deeper setup and architecture, see [README.md](./README.md) and
[ARCHITECTURE.md](./ARCHITECTURE.md).
