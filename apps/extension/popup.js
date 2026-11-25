/**
 * KeyNotes — Extension Panel Script
 *
 * Normalizes YouTube watch/share/Shorts URLs to a videoId, caches successful
 * results in this document's memory only, handles drag-and-drop, and shows
 * accessible feedback. Closing or reloading resets the session.
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
      cache.set(data.videoId || videoId, data.keynotes);
      showResults(data.videoId || videoId, data.keynotes);
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
      form.requestSubmit();
    }
  });
})();
