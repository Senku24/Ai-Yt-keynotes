# KeyNotes — Chrome Extension

A Chrome extension that gives you transcript-grounded takeaways from any YouTube video.

## Install (unpacked)

1. Open `chrome://extensions`
2. Enable **Developer mode** (toggle in the top-right)
3. Click **Load unpacked**
4. Select this `apps/extension` folder

## How it works

- **Click the toolbar icon** while on any page → Chrome resizes the current window to 75 % of your screen and opens a KeyNotes panel on the right 25 %.
- If you're on a YouTube page, the video URL is **auto-filled** and submitted.
- **Paste or drop** any YouTube link into the input to generate keynotes.
- Results are **cached for the session** — reopening the same link is instant.
- Closing the panel or navigating away resets the session.

## Configuration

Edit the `API_ENDPOINT` constant at the top of `popup.js` to point to your deployed backend (defaults to `http://localhost:3001/keynotes`).
