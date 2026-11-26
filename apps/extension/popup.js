/**
 * GrumpNotes — Extension Side Panel Script
 *
 * Normalizes YouTube watch/share/Shorts URLs to a videoId, pre-fills the
 * active tab's YouTube URL in the input (without auto-submitting), caches
 * successful roasts in this document's memory only, and supports drag-and-drop.
 */

(() => {
  const API_ENDPOINT = "http://localhost:3001/keynotes";

  // View-scoped memory cache: videoId -> roasts[]
  const cache = new Map();

  const GRUMBLES = [
    "PUTTING ON MY READING GLASSES…",
    "JUDGING YOUR WATCH HISTORY…",
    "READING THIS GARBAGE TRANSCRIPT…",
    "SHAKING MY FIST AT THE CLOUD…",
  ];

  const form = document.getElementById("url-form");
  const urlInput = document.getElementById("url-input");
  const submitBtn = document.getElementById("submit-btn");
  const btnText = submitBtn.querySelector(".btn-text");
  const btnSpinner = submitBtn.querySelector(".btn-spinner");
  const toast = document.getElementById("toast");
  const toastMsg = document.getElementById("toast-msg");
  const toastClose = document.getElementById("toast-close");
  const skeleton = document.getElementById("skeleton");
  const skelStatus = document.getElementById("skel-status");
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
  let grumbleTimer = null;

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

    if (grumbleTimer) {
      clearInterval(grumbleTimer);
      grumbleTimer = null;
    }

    if (on) {
      let idx = 0;
      skelStatus.textContent = GRUMBLES[0];
      grumbleTimer = setInterval(() => {
        idx = (idx + 1) % GRUMBLES.length;
        skelStatus.textContent = GRUMBLES[idx];
      }, 1600);
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

  function showResults(videoId, roasts) {
    activeResultVideoId = videoId;
    notesList.innerHTML = "";
    roasts.forEach((roast) => {
      const li = document.createElement("li");
      li.textContent = roast;
      notesList.appendChild(li);
    });
    sourceLink.href = `https://www.youtube.com/watch?v=${videoId}`;
    results.hidden = false;
    empty.hidden = true;
    toast.hidden = true;
  }

  async function fetchRoasts(url) {
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
      throw new Error(err.message || "Grandpa choked on his dentures. Try again.");
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
      showError("That ain't a YouTube watch, share, or Shorts link, genius.");
      return;
    }

    if (cache.has(videoId)) {
      showResults(videoId, cache.get(videoId));
      return;
    }

    setLoading(true);
    try {
      const data = await fetchRoasts(raw);
      const resolvedId = data.videoId || videoId;
      cache.set(resolvedId, data.keynotes);
      showResults(resolvedId, data.keynotes);
    } catch (err) {
      showError(err instanceof Error ? err.message : "Grandpa choked on his dentures. Try again.");
    } finally {
      setLoading(false);
    }
  });

  copyBtn.addEventListener("click", async () => {
    const items = notesList.querySelectorAll("li");
    const text = Array.from(items)
      .map((li, i) => `#${i + 1} ${li.textContent}`)
      .join("\n");
    try {
      await navigator.clipboard.writeText(text);
      copyBtn.classList.add("copied");
      copyLabel.textContent = "COPIED!";
      setTimeout(() => {
        copyBtn.classList.remove("copied");
        copyLabel.textContent = "COPY ROAST";
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
  if (typeof chrome !== "undefined" && chrome.tabs?.query) {
    chrome.tabs
      .query({ active: true, currentWindow: true })
      .then(([activeTab]) => {
        if (activeTab?.url) {
          applyPrefillUrl(activeTab.url);
        }
      })
      .catch(() => {
        // ignore tabs query errors
      });
  }
})();
