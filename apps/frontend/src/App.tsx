import axios from "axios";
import { ArrowUpRight, Check, Clipboard, Loader2 } from "lucide-react";
import { useCallback, useRef, useState, type FormEvent } from "react";
import { Button } from "./components/ui/button.tsx";
import "./index.css";

type ApiError = {
  error?: { code?: string; message?: string };
};

const isLocal = ["localhost", "127.0.0.1"].includes(window.location.hostname);
const endpoint = isLocal ? "http://localhost:3001/keynotes" : "/keynotes";
const YOUTUBE_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com"]);

function normalizeYoutubeVideoId(input: string): string | null {
  try {
    const url = new URL(input.trim());
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.port) {
      return null;
    }
    const pathName = url.pathname.replace(/\/$/, "");
    let videoId: string | null = null;
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

/* ── brand mark ─────────────────────────────────────────────── */
function BrandMark() {
  return (
    <div
      aria-hidden="true"
      className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-gradient-to-br from-[#f43f5e] via-[#ff5a36] to-[#ff8a3d] shadow-[0_6px_18px_rgba(255,77,77,0.28),inset_0_1px_0_rgba(255,255,255,0.28)]"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path
          d="M5.5 6.8C5.5 5.95 6.45 5.44 7.16 5.91L12.1 9.11C12.74 9.52 12.74 10.48 12.1 10.89L7.16 14.09C6.45 14.56 5.5 14.05 5.5 13.2V6.8Z"
          fill="white"
        />
        <rect x="14.5" y="6.5" width="5" height="2.2" rx="1.1" fill="white" />
        <rect x="14.5" y="10.9" width="3.8" height="2.2" rx="1.1" fill="white" fillOpacity="0.88" />
        <rect x="14.5" y="15.3" width="4.6" height="2.2" rx="1.1" fill="white" fillOpacity="0.72" />
      </svg>
    </div>
  );
}

/* ── toast ─────────────────────────────────────────────────── */
function Toast({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="animate-in slide-in-from-top-2 fade-in fixed left-1/2 top-6 z-50 w-[min(92vw,30rem)] -translate-x-1/2 rounded-xl border border-rose-400/35 bg-[#360f19]/92 px-4 py-3 text-sm font-medium text-rose-100 shadow-xl backdrop-blur-md"
    >
      <div className="flex items-center justify-between gap-3">
        <span>{message}</span>
        <button
          type="button"
          onClick={onDismiss}
          className="rounded px-1.5 py-0.5 text-rose-200/70 transition-colors hover:text-white"
          aria-label="Dismiss notification"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

/* ── skeleton loader ───────────────────────────────────────── */
function SkeletonBullets() {
  return (
    <div
      role="status"
      aria-label="Generating keynotes"
      className="rounded-2xl border border-white/8 bg-[#14141d]/85 p-6 backdrop-blur-md"
    >
      <p className="mb-4 text-xs font-medium tracking-wide text-[#ff8a3d]">
        Distilling transcript…
      </p>
      <div className="space-y-3.5">
        {[84, 68, 92, 60, 76].map((w, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="size-5 shrink-0 rounded-md bg-[#ff5a36]/15 animate-pulse" />
            <div
              className="h-3.5 rounded-md bg-white/8 animate-pulse"
              style={{ width: `${w}%` }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── result card ───────────────────────────────────────────── */
function KeynotesCard({ notes, videoId }: { notes: string[]; videoId: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    const text = notes.map((n) => `• ${n}`).join("\n");
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }, [notes]);

  return (
    <section
      aria-labelledby="notes-heading"
      className="animate-in fade-in slide-in-from-bottom-2 overflow-hidden rounded-2xl border border-white/12 bg-[#161622]/90 shadow-[0_18px_48px_rgba(0,0,0,0.45)] backdrop-blur-md"
    >
      <div className="h-[2px] w-full bg-gradient-to-r from-[#f43f5e] via-[#ff5a36] to-[#ff8a3d]" />

      <div className="p-6">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-gradient-to-br from-[#f43f5e] to-[#ff8a3d]" />
            <h2
              id="notes-heading"
              className="text-xs font-semibold uppercase tracking-[0.12em] text-[#a1a1b5]"
            >
              Keynotes
            </h2>
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
              copied
                ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-300"
                : "border-white/10 bg-white/[0.04] text-[#a1a1b5] hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
            }`}
            aria-label="Copy keynotes"
          >
            {copied ? <Check className="size-3.5" /> : <Clipboard className="size-3.5" />}
            <span>{copied ? "Copied" : "Copy"}</span>
          </button>
        </div>

        <ol className="space-y-3.5">
          {notes.map((note, index) => (
            <li
              key={`${index}-${note}`}
              className="flex items-start gap-3 text-[15px] leading-relaxed text-[#f5f4f8]"
            >
              <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-md bg-[#ff5a36]/15 text-xs font-bold tabular-nums text-[#ff8a3d]">
                {index + 1}
              </span>
              <span>{note}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="border-t border-white/8 bg-black/20 px-6 py-3">
        <a
          href={`https://www.youtube.com/watch?v=${videoId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs font-medium text-[#66667c] transition-colors hover:text-[#ff8a3d]"
        >
          <span>Open on YouTube</span>
          <ArrowUpRight className="size-3.5" />
        </a>
      </div>
    </section>
  );
}

/* ── main app ──────────────────────────────────────────────── */
export default function App() {
  const urlRef = useRef<HTMLInputElement>(null);
  const cacheRef = useRef<Map<string, string[]>>(new Map());
  const dragDepthRef = useRef(0);

  const [notes, setNotes] = useState<string[]>([]);
  const [videoId, setVideoId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const rawUrl = urlRef.current?.value.trim() ?? "";
    if (!rawUrl || loading) return;

    const normalizedId = normalizeYoutubeVideoId(rawUrl);
    if (!normalizedId) {
      setError("Please paste a valid YouTube watch, share, or Shorts link.");
      return;
    }

    const cached = cacheRef.current.get(normalizedId);
    if (cached) {
      setError("");
      setVideoId(normalizedId);
      setNotes(cached);
      return;
    }

    setLoading(true);
    setError("");
    setNotes([]);
    setVideoId("");

    try {
      const { data } = await axios.post<{ videoId: string; keynotes: string[] }>(endpoint, {
        url: rawUrl,
      });
      const resolvedId = data.videoId || normalizedId;
      cacheRef.current.set(resolvedId, data.keynotes);
      setNotes(data.keynotes);
      setVideoId(resolvedId);
    } catch (err) {
      const failure = axios.isAxiosError(err) ? (err.response?.data as ApiError)?.error : null;
      setError(
        failure?.code === "TRANSCRIPT_UNAVAILABLE"
          ? "Sorry, no transcript is available for this video."
          : failure?.message ?? "Could not generate keynotes. Try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragDepthRef.current += 1;
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) {
      setDragActive(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragDepthRef.current = 0;
    setDragActive(false);
    const uriList = e.dataTransfer
      .getData("text/uri-list")
      ?.split("\n")
      .find((line) => line && !line.startsWith("#"))
      ?.trim();
    const dropped = uriList || e.dataTransfer.getData("text/plain")?.trim();
    if (dropped && urlRef.current) {
      urlRef.current.value = dropped;
      urlRef.current.form?.requestSubmit();
    }
  }, []);

  return (
    <>
      {error && <Toast message={error} onDismiss={() => setError("")} />}

      <main
        className="mx-auto flex min-h-dvh max-w-xl flex-col px-5 py-16 sm:py-24"
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {/* header */}
        <header className="mb-10">
          <div className="mb-3 flex items-center gap-3">
            <BrandMark />
            <h1 className="text-2xl font-bold tracking-tight text-[#f5f4f8] sm:text-3xl">
              Key
              <span className="bg-gradient-to-r from-[#f43f5e] via-[#ff5a36] to-[#ff8a3d] bg-clip-text text-transparent">
                Notes
              </span>
            </h1>
          </div>
          <p className="text-sm text-[#a1a1b5]">
            Paste a YouTube link and distill the transcript into five crisp takeaways.
          </p>
        </header>

        {/* form */}
        <form onSubmit={handleSubmit} noValidate className="mb-7">
          <label htmlFor="video-url" className="sr-only">
            YouTube URL
          </label>
          <div
            className={`flex items-center gap-2 rounded-2xl border bg-[#14141d]/85 p-1.5 backdrop-blur-md transition-all ${
              dragActive
                ? "border-[#ff5a36]/65 ring-4 ring-[#ff5a36]/15"
                : "border-white/10 focus-within:border-[#ff5a36]/55 focus-within:ring-4 focus-within:ring-[#ff5a36]/15"
            }`}
          >
            <input
              ref={urlRef}
              id="video-url"
              name="url"
              type="text"
              inputMode="url"
              placeholder="https://youtube.com/watch?v=… or youtu.be/…"
              autoComplete="off"
              spellCheck={false}
              readOnly={loading}
              className="h-10 min-w-0 flex-1 bg-transparent px-3 text-sm text-[#f5f4f8] placeholder:text-[#66667c] focus:outline-none"
            />
            <Button
              type="submit"
              disabled={loading}
              className="h-10 shrink-0 rounded-xl bg-gradient-to-r from-[#f43f5e] via-[#ff5a36] to-[#ff8a3d] px-5 font-semibold text-white shadow-[0_4px_14px_rgba(255,77,77,0.28)] transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-45"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : "Generate"}
            </Button>
          </div>
        </form>

        {/* results */}
        {loading && <SkeletonBullets />}
        {notes.length > 0 && <KeynotesCard notes={notes} videoId={videoId} />}

        {/* empty state */}
        {!loading && notes.length === 0 && !error && (
          <div className="mt-2 rounded-2xl border border-dashed border-white/10 bg-[#14141d]/40 px-6 py-10 text-center">
            <p className="text-sm text-[#a1a1b5]">
              Drop or paste a YouTube link above to get started.
            </p>
            <p className="mt-1.5 text-xs text-[#66667c]">
              Supports watch, youtu.be, and Shorts URLs
            </p>
          </div>
        )}
      </main>
    </>
  );
}
