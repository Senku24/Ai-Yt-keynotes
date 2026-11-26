# GrumpNotes — Chrome Extension

An angry pixelated old man roasts your YouTube video picks from the transcript so you stop wasting your life watching them.

## Install / Reload (unpacked)

1. Open `chrome://extensions`
2. Enable **Developer mode** (toggle in the top-right)
3. Click **Load unpacked** and select `apps/extension` (or click **Reload** on the card after updates)

## How it works

- **Click the toolbar icon** → Opens the GrumpNotes popup on screen.
- If the active tab is a YouTube video (watch, `youtu.be`, or Shorts), its URL is placed in the input box by default without auto-submitting.
- **Click ROAST ME!** (or drop a link) to get 1–5 transcript-grounded roasts.
- Repeated links within the open popup reuse the cached roast; closing the popup resets the session.

## Configuration

Edit `API_ENDPOINT` in `popup.js` to point to your deployed backend (defaults to `http://localhost:3001/keynotes`).
