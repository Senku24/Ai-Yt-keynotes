/**
 * KeyNotes — Extension Side Panel Script
 *
 * Normalizes YouTube watch/share/Shorts URLs to a videoId, pre-fills the
 * active tab's YouTube URL in the input (without auto-submitting), caches
 * successful results in this document's memory only, and supports drag-and-drop.
 */

(() => {
  const API_ENDPOINT = "http://localhost:3001/keynotes";

  // View-scoped memory cache: videoId -> keynotes[]
  const cache = new Map();

  const form = document.getElementById("url-form");
  const urlInput = document.getElementById("url-input");
  const submitBtn = document.getElementById("submit-btn");
  const btnText = submitBtn.querySelector(".btn-text");
  const btnSpinner = submitBtn.querySelector(".btn-spinner");
  const toast = document.getElementById("toast");
  const toastMsg = document.getElementById("toast-msg");
  const toastClose = document.getElementById("toast-close");
  const skeleton = document.getElementById("skeleton");
  const results = document.getElementById("results");
  const notesList = document.getElementById("notes-list");
  const copyBtn = document.getElementById("copy-btn");
  const copyLabel = document.getElementById("copy-label");
  const sourceLink = document.getElementById("source-link");
  const empty = document.getElementById("empty");

  let loading = false;
  let dragDepth = 0;
  let userEditedInput = false;
  let activeResultVideoId = "";

  const YOUTUBE_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com"]);

  function normalizeYoutubeVideoId(input) {
    try {
      const url = new URL(input.trim());
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
      return videoId && /^[A-Za-z0-9_-]{11}$/.test(videoId) ? videoId : null;
    } catch {
      return null;
    }
  }

  function applyPrefillUrl(url, { force = false } = {}) {
    if (!url || loading) return;
    const videoId = normalizeYoutubeVideoId(url);
    if (!videoId) return;

    if (force) {
      if (videoId !== activeResultVideoId) {
        urlInput.value = url;
        userEditedInput = false;
      }
      return;
    }

    if (!userEditedInput && !urlInput.value.trim()) {
      urlInput.value = url;
    }
  }

  function setLoading(on) {
    loading = on;
    submitBtn.disabled = on;
    urlInput.readOnly = on;
    btnText.hidden = on;
    btnSpinner.hidden = !on;
    skeleton.hidden = !on;
    if (on) {
      results.hidden = true;
      empty.hidden = true;
      toast.hidden = true;
    }
  }

  function showError(msg) {
    toastMsg.textContent = msg;
    toast.hidden = false;
    if (results.hidden) {
      empty.hidden = true;
    }
  }

  function hideError() {
    toast.hidden = true;
    toastMsg.textContent = "";
    if (results.hidden && !loading) {
      empty.hidden = false;
    }
  }

  function showResults(videoId, keynotes) {
    activeResultVideoId = videoId;
    notesList.innerHTML = "";
    keynotes.forEach((note) => {
      const li = document.createElement("li");
      li.textContent = note;
      notesList.appendChild(li);
    });
    sourceLink.href = `https://www.youtube.com/watch?v=${videoId}`;
    results.hidden = false;
    empty.hidden = true;
    toast.hidden = true;
  }

  async function fetchKeynotes(url) {
    const res = await fetch(API_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const err = data?.error || {};
      if (err.code === "TRANSCRIPT_UNAVAILABLE") {
        throw new Error("Sorry, no transcript is available for this video.");
      }
      throw new Error(err.message || "Could not generate keynotes. Try again.");
    }

    return data;
  }

  urlInput.addEventListener("input", () => {
    userEditedInput = true;
  });

  toastClose.addEventListener("click", hideError);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const raw = urlInput.value.trim();
    if (!raw || loading) return;

    const videoId = normalizeYoutubeVideoId(raw);
    if (!videoId) {
      showError("Please paste a valid YouTube watch, share, or Shorts link.");
      return;
    }

    if (cache.has(videoId)) {
      showResults(videoId, cache.get(videoId));
      return;
    }

    setLoading(true);
    try {
      const data = await fetchKeynotes(raw);
      const resolvedId = data.videoId || videoId;
      cache.set(resolvedId, data.keynotes);
      showResults(resolvedId, data.keynotes);
    } catch (err) {
      showError(err instanceof Error ? err.message : "Could not generate keynotes. Try again.");
    } finally {
      setLoading(false);
    }
  });

  copyBtn.addEventListener("click", async () => {
    const items = notesList.querySelectorAll("li");
    const text = Array.from(items)
      .map((li) => `• ${li.textContent}`)
      .join("\n");
    try {
      await navigator.clipboard.writeText(text);
      copyBtn.classList.add("copied");
      copyLabel.textContent = "Copied";
      setTimeout(() => {
        copyBtn.classList.remove("copied");
        copyLabel.textContent = "Copy";
      }, 1800);
    } catch {
      // ignore clipboard errors
    }
  });

  document.body.addEventListener("dragenter", (e) => {
    e.preventDefault();
    dragDepth++;
    document.body.classList.add("drag-active");
  });

  document.body.addEventListener("dragleave", (e) => {
    e.preventDefault();
    dragDepth = Math.max(0, dragDepth - 1);
    if (dragDepth === 0) {
      document.body.classList.remove("drag-active");
    }
  });

  document.body.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  });

  document.body.addEventListener("drop", (e) => {
    e.preventDefault();
    dragDepth = 0;
    document.body.classList.remove("drag-active");
    const dropped =
      e.dataTransfer.getData("text/uri-list")?.split("\n").find((l) => l && !l.startsWith("#"))?.trim() ||
      e.dataTransfer.getData("text/plain")?.trim();
    if (dropped) {
      urlInput.value = dropped;
      userEditedInput = true;
      form.requestSubmit();
    }
  });

  // ── Pre-fill current tab's YouTube URL without auto-submitting ──
  if (typeof chrome !== "undefined") {
    chrome.runtime?.onMessage?.addListener((message) => {
      if (message?.type === "KEYNOTES_PREFILL_URL" && message.url) {
        chrome.tabs?.query({ active: true, currentWindow: true }, (tabs) => {
          const activeId = tabs?.[0]?.id;
          if (typeof message.tabId !== "number" || typeof activeId !== "number" || activeId === message.tabId) {
            applyPrefillUrl(message.url, { force: true });
          }
        });
      }
    });

    chrome.storage?.onChanged?.addListener((changes, areaName) => {
      if (areaName === "session" && changes.prefillUrl?.newValue) {
        applyPrefillUrl(changes.prefillUrl.newValue);
      }
    });

    (async () => {
      let activeTab = null;
      try {
        [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      } catch {
        // ignore tabs query errors
      }

      try {
        const stored = await chrome.storage?.session?.get(["prefillUrl", "prefillTabId", "prefillAt"]);
        const isFresh = stored?.prefillUrl && Date.now() - (stored.prefillAt || 0) < 15_000;
        const matchesTab =
          typeof stored?.prefillTabId !== "number" ||
          typeof activeTab?.id !== "number" ||
          stored.prefillTabId === activeTab.id;

        if (isFresh && matchesTab) {
          applyPrefillUrl(stored.prefillUrl);
          await chrome.storage.session.remove(["prefillUrl", "prefillTabId", "prefillAt"]);
          return;
        }
      } catch {
        // ignore storage errors
      }

      if (activeTab?.url) {
        applyPrefillUrl(activeTab.url);
      }
    })();
  }
})();
