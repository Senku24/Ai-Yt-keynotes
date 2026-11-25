/**
 * KeyNotes — Chrome Extension Background Service Worker
 *
 * When the user clicks the toolbar icon, this script:
 * 1. Gets the work area of the display containing the active window.
 * 2. Resizes the current browser window to 75% left.
 * 3. Opens or reuses a KeyNotes popup window on the right 25%.
 * 4. If the active tab is a YouTube video, auto-pastes its URL.
 */

const NOTES_WINDOW_KEY = "keynotes_window_id";
const MIN_WIDTH = 360;
const MIN_HEIGHT = 400;

/**
 * Get the work area bounds for the display containing the given window.
 * Falls back to full display if the Display API is not available.
 */
async function getWorkArea(win) {
  // chrome.system.display is not available without "system.display" permission,
  // so we estimate from the window's current state.
  // For best results the popup is sized relative to the current window.
  const width = win.width || screen.availWidth;
  const height = win.height || screen.availHeight;
  const left = win.left || 0;
  const top = win.top || 0;

  // If window is fullscreen/maximized, use screen dimensions
  if (win.state === "fullscreen" || win.state === "maximized") {
    return {
      left: 0,
      top: 0,
      width: screen.availWidth || 1440,
      height: screen.availHeight || 900,
    };
  }

  // Estimate the work area as the screen containing this window
  return {
    left: 0,
    top: 0,
    width: Math.max(screen.availWidth || 1440, left + width),
    height: Math.max(screen.availHeight || 900, top + height),
  };
}

/**
 * Detect if a URL is a YouTube video and extract its URL.
 */
function getYouTubeUrl(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (
      u.hostname === "youtu.be" ||
      u.hostname === "www.youtube.com" ||
      u.hostname === "youtube.com" ||
      u.hostname === "m.youtube.com"
    ) {
      return url;
    }
  } catch {
    // ignore
  }
  return null;
}

chrome.action.onClicked.addListener(async (tab) => {
  try {
    const currentWindow = await chrome.windows.getCurrent();

    // Normalize fullscreen/maximized windows before repositioning
    if (
      currentWindow.state === "fullscreen" ||
      currentWindow.state === "maximized"
    ) {
      await chrome.windows.update(currentWindow.id, { state: "normal" });
      // Small delay for the state change to take effect
      await new Promise((r) => setTimeout(r, 150));
    }

    const workArea = await getWorkArea(currentWindow);
    const splitLeft = workArea.left;
    const splitWidth = Math.round(workArea.width * 0.75);
    const notesLeft = splitLeft + splitWidth;
    const notesWidth = Math.max(workArea.width - splitWidth, MIN_WIDTH);
    const notesHeight = Math.max(workArea.height, MIN_HEIGHT);

    // Resize main browser window to 75% left
    await chrome.windows.update(currentWindow.id, {
      left: splitLeft,
      top: workArea.top,
      width: splitWidth,
      height: workArea.height,
    });

    // Build the popup URL with an optional YouTube link
    const youtubeUrl = getYouTubeUrl(tab?.url);
    let popupUrl = chrome.runtime.getURL("popup.html");
    if (youtubeUrl) {
      popupUrl += `?url=${encodeURIComponent(youtubeUrl)}`;
    }

    // Try to reuse an existing KeyNotes window
    const stored = await chrome.storage.session.get(NOTES_WINDOW_KEY);
    const existingId = stored[NOTES_WINDOW_KEY];

    if (existingId) {
      try {
        const existingWin = await chrome.windows.get(existingId);
        if (existingWin) {
          // Reposition and focus
          await chrome.windows.update(existingId, {
            left: notesLeft,
            top: workArea.top,
            width: notesWidth,
            height: notesHeight,
            focused: true,
          });

          // If we have a YouTube URL, send it to the popup
          if (youtubeUrl) {
            const tabs = await chrome.tabs.query({ windowId: existingId });
            if (tabs[0]) {
              await chrome.tabs.update(tabs[0].id, { url: popupUrl });
            }
          }
          return;
        }
      } catch {
        // Window no longer exists; create a new one
      }
    }

    // Create a new popup window on the right 25%
    const notesWin = await chrome.windows.create({
      url: popupUrl,
      type: "popup",
      left: notesLeft,
      top: workArea.top,
      width: notesWidth,
      height: notesHeight,
      focused: true,
    });

    // Store the window ID for reuse
    await chrome.storage.session.set({ [NOTES_WINDOW_KEY]: notesWin.id });

    // Check actual bounds and fix if the OS didn't honor our request
    const actual = await chrome.windows.get(notesWin.id);
    if (
      actual.width < MIN_WIDTH ||
      actual.height < MIN_HEIGHT
    ) {
      await chrome.windows.update(notesWin.id, {
        width: Math.max(actual.width, MIN_WIDTH),
        height: Math.max(actual.height, MIN_HEIGHT),
      });
    }
  } catch (err) {
    console.error("[KeyNotes background]", err);
  }
});

// Clean up stored window ID when the notes window closes
chrome.windows.onRemoved.addListener(async (windowId) => {
  const stored = await chrome.storage.session.get(NOTES_WINDOW_KEY);
  if (stored[NOTES_WINDOW_KEY] === windowId) {
    await chrome.storage.session.remove(NOTES_WINDOW_KEY);
  }
});
