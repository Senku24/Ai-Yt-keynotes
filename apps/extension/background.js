/**
 * KeyNotes — Chrome Extension Background Service Worker
 *
 * Clicking the toolbar icon:
 * 1. Resolves the work area for the display containing the active browser window
 *    via chrome.system.display.getInfo().
 * 2. Normalizes fullscreen / maximized / minimized windows before resizing.
 * 3. Splits the display work area: 75% left for the browser window, 25% right
 *    for the KeyNotes popup window.
 * 4. Reuses an existing KeyNotes popup window (found via chrome.windows.getAll so
 *    idle service-worker restarts never create duplicates) and preserves its state.
 * 5. Checks actual window bounds afterward; if Chrome or the OS cannot fit the
 *    split, restores the browser window's original bounds and keeps the notes
 *    window usable at a supported size.
 */

const NOTES_WINDOW_KEY = "keynotes_window_id";
const POPUP_PATH = "popup.html";
const MIN_USABLE_WIDTH = 380;
const MIN_USABLE_HEIGHT = 540;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function rectOverlapArea(a, b) {
  const x1 = Math.max(a.left, b.left);
  const y1 = Math.max(a.top, b.top);
  const x2 = Math.min(a.left + a.width, b.left + b.width);
  const y2 = Math.min(a.top + a.height, b.top + b.height);
  if (x2 <= x1 || y2 <= y1) return 0;
  return (x2 - x1) * (y2 - y1);
}

/**
 * Find the display workArea containing the given window.
 */
async function getDisplayWorkArea(win) {
  if (chrome.system?.display?.getInfo) {
    try {
      const displays = await chrome.system.display.getInfo();
      if (displays.length > 0) {
        const winRect = {
          left: win.left ?? 0,
          top: win.top ?? 0,
          width: win.width ?? 1280,
          height: win.height ?? 800,
        };
        const centerX = winRect.left + winRect.width / 2;
        const centerY = winRect.top + winRect.height / 2;

        let best = null;
        let bestOverlap = -1;

        for (const display of displays) {
          const area = display.bounds;
          const overlap = rectOverlapArea(winRect, area);
          if (overlap > bestOverlap) {
            bestOverlap = overlap;
            best = display;
          }
        }

        if (!best || bestOverlap <= 0) {
          best =
            displays.find(
              (d) =>
                centerX >= d.bounds.left &&
                centerX <= d.bounds.left + d.bounds.width &&
                centerY >= d.bounds.top &&
                centerY <= d.bounds.top + d.bounds.height,
            ) ||
            displays.find((d) => d.isPrimary) ||
            displays[0];
        }

        const wa = best.workArea || best.bounds;
        return {
          left: Math.round(wa.left),
          top: Math.round(wa.top),
          width: Math.round(wa.width),
          height: Math.round(wa.height),
        };
      }
    } catch (err) {
      console.warn("[KeyNotes] Display API unavailable, using window bounds:", err);
    }
  }

  return {
    left: Math.round(win.left ?? 0),
    top: Math.round(win.top ?? 0),
    width: Math.round(win.width ?? 1280),
    height: Math.round(win.height ?? 800),
  };
}

/**
 * Wait until a window reports state === "normal" after leaving fullscreen/maximized.
 */
async function normalizeWindow(win) {
  if (!win || win.state === "normal") return win;

  const wasFullscreen = win.state === "fullscreen";
  await chrome.windows.update(win.id, { state: "normal" });

  const timeoutMs = wasFullscreen ? 1800 : 600;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    await sleep(75);
    const updated = await chrome.windows.get(win.id);
    if (updated.state === "normal") {
      // Allow macOS Space transition to settle after exiting native fullscreen
      if (wasFullscreen) await sleep(220);
      return await chrome.windows.get(win.id);
    }
  }

  return await chrome.windows.get(win.id);
}

/**
 * Find an existing KeyNotes popup window via the Windows API first so idle
 * service-worker restarts cannot create duplicate windows.
 */
async function findExistingNotesWindow(popupUrl) {
  try {
    const popups = await chrome.windows.getAll({
      populate: true,
      windowTypes: ["popup"],
    });
    const match = popups.find((w) =>
      w.tabs?.some((t) => t.url && t.url.startsWith(popupUrl)),
    );
    if (match) return match;
  } catch {
    // ignore and check session storage fallback
  }

  try {
    const stored = await chrome.storage.session.get(NOTES_WINDOW_KEY);
    const id = stored[NOTES_WINDOW_KEY];
    if (typeof id === "number") {
      return await chrome.windows.get(id);
    }
  } catch {
    // stored window no longer exists
  }

  return null;
}

async function restoreBrowserWindow(winId, originalState, originalBounds) {
  try {
    if (originalState === "fullscreen" || originalState === "maximized") {
      await chrome.windows.update(winId, { state: originalState });
    } else if (
      typeof originalBounds.left === "number" &&
      typeof originalBounds.top === "number" &&
      typeof originalBounds.width === "number" &&
      typeof originalBounds.height === "number"
    ) {
      await chrome.windows.update(winId, {
        left: originalBounds.left,
        top: originalBounds.top,
        width: originalBounds.width,
        height: originalBounds.height,
      });
    }
  } catch (err) {
    console.warn("[KeyNotes] Could not restore browser bounds:", err);
  }
}

chrome.action.onClicked.addListener(async (tab) => {
  const popupUrl = chrome.runtime.getURL(POPUP_PATH);
  let browserWin = null;
  let originalState = "normal";
  let originalBounds = null;
  let workArea = null;
  let notesWin = null;

  try {
    if (typeof tab?.windowId === "number") {
      browserWin = await chrome.windows.get(tab.windowId);
    } else {
      browserWin = await chrome.windows.getLastFocused({ windowTypes: ["normal"] });
    }

    if (browserWin.type !== "normal") {
      browserWin = await chrome.windows.getLastFocused({ windowTypes: ["normal"] });
    }

    originalState = browserWin.state || "normal";
    originalBounds = {
      left: browserWin.left,
      top: browserWin.top,
      width: browserWin.width,
      height: browserWin.height,
    };

    // Resolve work area before or right around normalizing
    workArea = await getDisplayWorkArea(browserWin);

    // Normalize fullscreen / maximized / minimized before setting bounds
    if (originalState !== "normal") {
      browserWin = await normalizeWindow(browserWin);
      workArea = await getDisplayWorkArea(browserWin);
    }

    const browserWidth = Math.floor(workArea.width * 0.75);
    const notesWidth = workArea.width - browserWidth;

    const browserRect = {
      left: workArea.left,
      top: workArea.top,
      width: browserWidth,
      height: workArea.height,
    };

    const notesRect = {
      left: workArea.left + browserWidth,
      top: workArea.top,
      width: notesWidth,
      height: workArea.height,
    };

    // Apply 75% left bounds to the browser window
    try {
      await chrome.windows.update(browserWin.id, browserRect);
    } catch (err) {
      console.warn("[KeyNotes] Browser resize failed:", err);
    }

    // Reuse existing notes window if open, otherwise create a new blank popup
    const existingNotes = await findExistingNotesWindow(popupUrl);
    if (existingNotes) {
      if (existingNotes.state && existingNotes.state !== "normal") {
        await normalizeWindow(existingNotes);
      }
      notesWin = await chrome.windows.update(existingNotes.id, {
        ...notesRect,
        focused: true,
      });
    } else {
      notesWin = await chrome.windows.create({
        url: popupUrl,
        type: "popup",
        ...notesRect,
        focused: true,
      });
    }

    if (notesWin?.id) {
      await chrome.storage.session.set({ [NOTES_WINDOW_KEY]: notesWin.id });
    }

    // Check actual bounds afterward; if Chrome/OS could not fit the split,
    // restore the original browser bounds and keep the notes window usable.
    await sleep(120);
    const actualBrowser = await chrome.windows.get(browserWin.id);
    const actualNotes = await chrome.windows.get(notesWin.id);

    const overlapX = actualBrowser.left + actualBrowser.width - actualNotes.left;
    const browserMismatched =
      Math.abs(actualBrowser.width - browserRect.width) > 32 ||
      Math.abs(actualBrowser.left - browserRect.left) > 32;
    const notesMismatched =
      Math.abs(actualNotes.width - notesRect.width) > 32 ||
      actualNotes.width < 280;
    const outOfBounds =
      actualNotes.left + actualNotes.width > workArea.left + workArea.width + 16;

    if (overlapX > 12 || browserMismatched || notesMismatched || outOfBounds) {
      await restoreBrowserWindow(browserWin.id, originalState, originalBounds);

      const fallbackWidth = Math.min(
        Math.max(MIN_USABLE_WIDTH, notesRect.width),
        workArea.width,
      );
      const fallbackHeight = Math.min(
        Math.max(MIN_USABLE_HEIGHT, Math.round(workArea.height * 0.78)),
        workArea.height,
      );

      await chrome.windows.update(notesWin.id, {
        left: workArea.left + Math.max(0, workArea.width - fallbackWidth),
        top: workArea.top,
        width: fallbackWidth,
        height: fallbackHeight,
        focused: true,
      });
    }
  } catch (err) {
    console.error("[KeyNotes background]", err);
    // Guarantee the user still gets a usable notes window even if split logic fails
    if (!notesWin) {
      try {
        const existing = await findExistingNotesWindow(popupUrl);
        if (existing) {
          await chrome.windows.update(existing.id, { focused: true });
        } else {
          const fallback = await chrome.windows.create({
            url: popupUrl,
            type: "popup",
            width: 400,
            height: 620,
            focused: true,
          });
          if (fallback?.id) {
            await chrome.storage.session.set({ [NOTES_WINDOW_KEY]: fallback.id });
          }
        }
      } catch (fallbackErr) {
        console.error("[KeyNotes fallback]", fallbackErr);
      }
    }
  }
});

chrome.windows.onRemoved.addListener(async (windowId) => {
  try {
    const stored = await chrome.storage.session.get(NOTES_WINDOW_KEY);
    if (stored[NOTES_WINDOW_KEY] === windowId) {
      await chrome.storage.session.remove(NOTES_WINDOW_KEY);
    }
  } catch {
    // ignore
  }
});
