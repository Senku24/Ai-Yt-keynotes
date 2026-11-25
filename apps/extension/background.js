/**
 * KeyNotes — Chrome Extension Background Service Worker
 *
 * Clicking the toolbar icon opens Chrome's native Side Panel inside the active
 * tab/window (preserving fullscreen and creating a side-by-side split view with
 * the YouTube tab on the left and KeyNotes on the right).
 *
 * If the active tab is a YouTube watch/share/Shorts URL, it places that URL
 * into the input box by default without auto-submitting.
 */

const YOUTUBE_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com"]);

function getYouTubeVideoUrl(input) {
  if (!input) return null;
  try {
    const url = new URL(input);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.port) {
      return null;
    }
    const pathName = url.pathname.replace(/\/$/, "");
    let videoId = null;
    if (url.hostname === "youtu.be") {
      videoId = pathName.slice(1);
    } else if (YOUTUBE_HOSTS.has(url.hostname)) {
      videoId =
        pathName === "/watch"
          ? url.searchParams.get("v")
          : /^\/shorts\/([^/]+)$/.exec(pathName)?.[1] ?? null;
    }
    return videoId && /^[A-Za-z0-9_-]{11}$/.test(videoId) ? input : null;
  } catch {
    return null;
  }
}

// Keep action.onClicked active so we capture the active tab's YouTube URL on click.
chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false }).catch(() => {});
});

async function handleActionPrefill(tabId, youtubeUrl, openPromise) {
  try {
    await chrome.storage.session.set({
      prefillUrl: youtubeUrl || "",
      prefillTabId: typeof tabId === "number" ? tabId : null,
      prefillAt: Date.now(),
    });
  } catch (err) {
    console.warn("[KeyNotes] Could not store prefill URL:", err);
  }

  try {
    await chrome.runtime.sendMessage({
      type: "KEYNOTES_PREFILL_URL",
      tabId: typeof tabId === "number" ? tabId : null,
      url: youtubeUrl || "",
    });
  } catch {
    // Side panel may still be mounting; it will read from chrome.storage.session.
  }

  try {
    await openPromise;
  } catch (err) {
    console.error("[KeyNotes] Could not open side panel:", err);
  }
}

chrome.action.onClicked.addListener((tab) => {
  // Call sidePanel.open synchronously before any await to preserve the user gesture.
  const openOptions =
    typeof tab?.id === "number" ? { tabId: tab.id } : { windowId: tab.windowId };
  const openPromise = chrome.sidePanel.open(openOptions);
  const youtubeUrl = getYouTubeVideoUrl(tab?.url);

  void handleActionPrefill(tab?.id, youtubeUrl, openPromise);
});
