/**
 * KeyNotes — Extension Popup Script
 *
 * Handles URL submission, API calls, result display, copy, drag-drop,
 * and session-scoped caching of results.
 */

(() => {
  // ── Config ──────────────────────────────────────────────────
  // In production, point this to your deployed backend
  const API_ENDPOINT = "http://localhost:3001/keynotes";

  // Session cache: videoId -> keynotes[]
  const cache = new Map();

  // ── DOM refs ────────────────────────────────────────────────
  const form = document.getElementById("url-form");
  const urlInput = document.getElementById("url-input");
  const submitBtn = document.getElementById("submit-btn");
  const btnText = submitBtn.querySelector(".btn-text");
  const btnSpinner = submitBtn.querySelector(".btn-spinner");
  const toast = document.getElementById("toast");
  const skeleton = document.getElementById("skeleton");
  const results = document.getElementById("results");
  const notesList = document.getElementById("notes-list");
  const copyBtn = document.getElementById("copy-btn");
  const sourceLink = document.getElementById("source-link");
  const empty = document.getElementById("empty");

  let currentVideoId = "";
  let loading = false;

  // ── Helpers ─────────────────────────────────────────────────
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
    toast.textContent = msg;
    toast.hidden = false;
    empty.hidden = true;
  }

  function showResults(videoId, keynotes) {
    currentVideoId = videoId;
    notesList.innerHTML = "";
    keynotes.forEach((note) => {
      const li = document.createElement("li");
      li.textContent = note;
      notesList.appendChild(li);
    });
    sourceLink.href = `https://www.youtube.com/watch?v=${videoId}`;
    results.hidden = false;
    empty.hidden = true;
  }

  // ── API call ────────────────────────────────────────────────
  async function fetchKeynotes(url) {
    const res = await fetch(API_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });

    const data = await res.json();

    if (!res.ok) {
      const err = data?.error || {};
      if (err.code === "TRANSCRIPT_UNAVAILABLE") {
        throw new Error("Sorry, no transcript is available for this video.");
      }
      throw new Error(err.message || "Could not generate keynotes. Try again.");
    }

    return data;
  }

  // ── Submit handler ──────────────────────────────────────────
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const url = urlInput.value.trim();
    if (!url || loading) return;

    // Check cache
    const cachedKey = url;
    if (cache.has(cachedKey)) {
      const cached = cache.get(cachedKey);
      showResults(cached.videoId, cached.keynotes);
      return;
    }

    setLoading(true);
    try {
      const data = await fetchKeynotes(url);
      cache.set(cachedKey, data);
      showResults(data.videoId, data.keynotes);
    } catch (err) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  });

  // ── Copy handler ────────────────────────────────────────────
  copyBtn.addEventListener("click", async () => {
    const items = notesList.querySelectorAll("li");
    const text = Array.from(items)
      .map((li) => `• ${li.textContent}`)
      .join("\n");
    try {
      await navigator.clipboard.writeText(text);
      copyBtn.style.color = "rgba(255,255,255,0.6)";
      setTimeout(() => (copyBtn.style.color = ""), 1500);
    } catch {
      // fallback
    }
  });

  // ── Drag & drop ─────────────────────────────────────────────
  document.body.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  });

  document.body.addEventListener("drop", (e) => {
    e.preventDefault();
    const text = e.dataTransfer.getData("text/plain")?.trim();
    if (text) {
      urlInput.value = text;
      form.requestSubmit();
    }
  });

  // ── Auto-fill from query param (sent by background.js) ─────
  const params = new URLSearchParams(location.search);
  const autoUrl = params.get("url");
  if (autoUrl) {
    urlInput.value = autoUrl;
    // Auto-submit after a brief delay so the popup renders first
    setTimeout(() => form.requestSubmit(), 100);
  }
})();
