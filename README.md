# GrumpNotes

Paste a YouTube link and an angry pixelated grandpa roasts the video using its transcript, so you can close the tab before wasting your time.

Available as a web app and as a Chrome extension popup.

## Screenshots

| Web App | Chrome Extension |
| --- | --- |
| !<img width="1035" height="621" alt="Screenshot 2026-11-26 at 6 05 41 AM" src="https://github.com/user-attachments/assets/30884754-c38b-48bc-afd8-4c32038ef442" />
| <img width="1151" height="799" alt="Screenshot 2026-11-26 at 6 07 37 AM" src="https://github.com/user-attachments/assets/5493bf03-6d02-4ed9-87e7-ce7bfda2b998" /> |


## Features

- Accepts `youtube.com/watch`, `youtu.be`, and `/shorts` links
- Fetches English transcripts and returns 1–5 transcript-specific roasts
- Caches results for the current session
- Chrome extension pre-fills the current YouTube tab's URL when opened

## Project Structure

```
apps/
├── backend/    Express API (Bun): transcript lookup and roast generation
├── frontend/   React + Tailwind web app (Bun)
└── extension/  Chrome Manifest V3 popup
```

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) 1.3+
- Node.js 24+
- An OpenAI API key and a [Supadata](https://supadata.ai) API key

### Install

```sh
bun install
```

### Configure

Create `apps/backend/.env`:

```env
BACKEND_PORT=3001
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=your_openai_model
SUPADATA_YT_API_KEY=your_supadata_api_key
```

### Run

Start the backend:

```sh
cd apps/backend
bun --hot index.ts
```

Start the web app:

```sh
cd apps/frontend
bun run dev
```

Build the web app for production:

```sh
cd apps/frontend
bun run build
```

## API

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/keynotes` (alias `/api/notes`) | Body `{ "url": "<YouTube URL>" }`. Returns `{ videoId, keynotes }` |
| `GET` | `/health` | Health check |

Errors return `{ "error": { "code", "message" } }`.

## Chrome Extension

1. Open `chrome://extensions` and enable **Developer mode**.
2. Click **Load unpacked** and select `apps/extension`.
3. Open a YouTube video, click the GrumpNotes icon, and press **ROAST ME!**.

The extension calls `http://localhost:3001/keynotes` by default. To use a deployed backend, change `API_ENDPOINT` in [apps/extension/popup.js](apps/extension/popup.js) and update `host_permissions` in [apps/extension/manifest.json](apps/extension/manifest.json).


