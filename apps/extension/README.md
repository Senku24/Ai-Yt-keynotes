# KeyNotes — Chrome Extension

A Chrome extension that gives you transcript-grounded takeaways from any YouTube video.

## Install / Reload (unpacked)

1. Open `chrome://extensions`
2. Enable **Developer mode** (toggle in the top-right)
3. Click **Load unpacked** and select `apps/extension` (or click the **Reload** icon on the card after updates)

## How it works

- **Click the toolbar icon** → Exits fullscreen/maximized if needed, places the browser window on the left 75% of the display work area, and opens (or focuses/repositions) the KeyNotes panel on the right 25%.
- If Chrome or the OS cannot fit the split, the browser's original bounds are restored and the KeyNotes window stays open at a usable size.
- **Paste or drop** any YouTube watch, `youtu.be`, or Shorts link to generate 1–5 keynotes.
- Repeated links within the open panel reuse the cached result; closing or reloading resets the session.

## Configuration

Edit `API_ENDPOINT` in `popup.js` to point to your deployed backend (defaults to `http://localhost:3001/keynotes`).
