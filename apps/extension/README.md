# KeyNotes — Chrome Extension

A Chrome extension that gives you transcript-grounded takeaways from any YouTube video.

## Install / Reload (unpacked)

1. Open `chrome://extensions`
2. Enable **Developer mode** (toggle in the top-right)
3. Click **Load unpacked** and select `apps/extension` (or click the **Reload** icon on the card after updates)

## How it works

- **Click the toolbar icon** → Opens Chrome's Side Panel on the right side of the active tab inside the same window (keeping fullscreen intact as an in-window split view).
- If the active tab is a YouTube video (watch, `youtu.be`, or Shorts), its URL is placed in the input box by default without auto-generating, so you decide when to click **Generate**.
- **Paste or drop** any YouTube watch, `youtu.be`, or Shorts link to generate 1–5 keynotes.
- Repeated links within the open panel reuse the cached result; closing or reloading resets the session.

## Configuration

Edit `API_ENDPOINT` in `popup.js` to point to your deployed backend (defaults to `http://localhost:3001/keynotes`).
