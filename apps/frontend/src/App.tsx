import axios from "axios";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import "./index.css";
import logo from "./logo.png";

type ApiError = {
  error?: { code?: string; message?: string };
};

const isLocal = ["localhost", "127.0.0.1"].includes(window.location.hostname);
const endpoint = isLocal ? "http://localhost:3001/keynotes" : "/keynotes";
const YOUTUBE_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com"]);

const GRUMBLES = [
  "PUTTING ON MY READING GLASSES…",
  "JUDGING YOUR WATCH HISTORY…",
  "READING THIS GARBAGE TRANSCRIPT…",
  "SHAKING MY FIST AT THE CLOUD…",
];

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

/* ── GrumpNotes logo ───────────────────────────────────────── */
function AngryOldManAvatar() {
  return (
    <img
      src={logo}
      alt="GrumpNotes logo"
      width={68}
      height={68}
      className="size-[68px] shrink-0 border-[3px] border-[#0c0814] bg-[#ef303e] object-contain p-1 shadow-[5px_5px_0_#0c0814]"
    />
  );
}

/* ── toast ─────────────────────────────────────────────────── */
function Toast({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed left-1/2 top-6 z-50 w-[min(92vw,36rem)] -translate-x-1/2 border-[3px] border-[#0c0814] bg-[#4e1120] px-5 py-3.5 text-base font-semibold text-[#ffd6dc] shadow-[5px_5px_0_#0c0814]"
    >
      <div className="flex items-center justify-between gap-3">
        <span>{message}</span>
        <button
          type="button"
          onClick={onDismiss}
          className="font-pixel-display bg-[#0c0814] px-2.5 py-1 text-xs text-[#ffe66d] hover:text-white"
          aria-label="Dismiss notification"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

/* ── skeleton loader ───────────────────────────────────────── */
function SkeletonRoast() {
  const [grumbleIdx, setGrumbleIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setGrumbleIdx((prev) => (prev + 1) % GRUMBLES.length);
    }, 1600);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      role="status"
      aria-label="Generating roasts"
      className="border-[3px] border-[#0c0814] bg-[#251d36] p-6 shadow-[6px_6px_0_#0c0814]"
    >
      <p className="font-pixel-display mb-3.5 text-sm text-[#ffe66d]">
        {GRUMBLES[grumbleIdx]}
      </p>
      <div className="mb-5 flex gap-2" aria-hidden="true">
        {["#ff3b4e", "#ff8424", "#ffe66d", "#ff8424", "#ff3b4e"].map((color, idx) => (
          <span
            key={idx}
            className="size-3 border-2 border-[#0c0814] animate-bounce"
            style={{ backgroundColor: color, animationDelay: `${idx * 100}ms` }}
          />
        ))}
      </div>
      <div className="space-y-3.5">
        {[88, 72, 94, 65].map((w, i) => (
          <div
            key={i}
            className="h-4 border-2 border-white/10 bg-[#2f2445]"
            style={{ width: `${w}%` }}
          />
        ))}
      </div>
    </div>
  );
}

/* ── result card ───────────────────────────────────────────── */
function RoastCard({ roasts, videoId }: { roasts: string[]; videoId: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    const text = roasts.map((r, i) => `#${i + 1} ${r}`).join("\n");
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }, [roasts]);

  return (
    <section
      aria-labelledby="notes-heading"
      className="border-[3px] border-[#0c0814] bg-[#251d36] shadow-[6px_6px_0_#0c0814]"
    >
      <div className="flex items-center justify-between gap-3 border-b-[3px] border-[#0c0814] bg-[#2f2445] px-6 py-4">
        <div className="flex items-center gap-2.5">
          <span aria-hidden="true" className="text-lg">
            💢
          </span>
          <h2 id="notes-heading" className="font-pixel-display text-sm font-bold text-[#ffe66d]">
            GRANDPA SAYS:
          </h2>
        </div>

        <button
          type="button"
          onClick={handleCopy}
          className={`font-pixel-display border-2 border-[#0c0814] px-3 py-1.5 text-xs font-bold text-[#0c0814] shadow-[2px_2px_0_#0c0814] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0_#0c0814] ${
            copied ? "bg-[#4ade80]" : "bg-[#ffe66d] hover:brightness-105"
          }`}
          aria-label="Copy roasts"
        >
          {copied ? "COPIED!" : "COPY ROAST"}
        </button>
      </div>

      <ol className="space-y-4 p-6">
        {roasts.map((roast, index) => (
          <li
            key={`${index}-${roast}`}
            className="flex items-start gap-3.5 text-lg leading-relaxed text-[#fff7e8]"
          >
            <span className="font-pixel-display mt-0.5 inline-flex h-7 min-w-8 shrink-0 items-center justify-center border-2 border-[#0c0814] bg-[#ff3b4e] px-1.5 text-xs font-bold text-white shadow-[2px_2px_0_#0c0814]">
              #{index + 1}
            </span>
            <span>{roast}</span>
          </li>
        ))}
      </ol>

      <div className="border-t-[3px] border-[#0c0814] bg-[#0c0814]/45 px-6 py-3.5">
        <a
          href={`https://www.youtube.com/watch?v=${videoId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="font-pixel-display inline-flex items-center gap-1 text-xs text-[#8f82a8] transition-colors hover:text-[#ffe66d]"
        >
          WATCH ANYWAY (COWARD) ↗
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

  const [roasts, setRoasts] = useState<string[]>([]);
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
      setError("That ain't a YouTube watch, share, or Shorts link, genius.");
      return;
    }

    const cached = cacheRef.current.get(normalizedId);
    if (cached) {
      setError("");
      setVideoId(normalizedId);
      setRoasts(cached);
      return;
    }

    setLoading(true);
    setError("");
    setRoasts([]);
    setVideoId("");

    try {
      const { data } = await axios.post<{ videoId: string; keynotes: string[] }>(endpoint, {
        url: rawUrl,
      });
      const resolvedId = data.videoId || normalizedId;
      cacheRef.current.set(resolvedId, data.keynotes);
      setRoasts(data.keynotes);
      setVideoId(resolvedId);
    } catch (err) {
      const failure = axios.isAxiosError(err) ? (err.response?.data as ApiError)?.error : null;
      setError(
        failure?.code === "TRANSCRIPT_UNAVAILABLE"
          ? "Sorry, no transcript is available for this video."
          : failure?.message ?? "Grandpa choked on his dentures. Try again.",
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
        className="mx-auto flex min-h-dvh max-w-2xl flex-col px-6 py-16 sm:py-24"
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {/* header */}
        <header className="mb-9">
          <div className="flex items-center gap-5">
            <AngryOldManAvatar />
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="font-pixel-display text-3xl font-bold tracking-tight text-[#ffe66d] drop-shadow-[3px_3px_0_#0c0814] sm:text-4xl">
                  GRUMP<span className="text-[#ff3b4e]">NOTES</span>
                </h1>
                <span className="font-pixel-display border-2 border-[#0c0814] bg-[#ff3b4e] px-2.5 py-1 text-xs font-bold text-white shadow-[2px_2px_0_#0c0814]">
                  NO MERCY
                </span>
              </div>
              <p className="mt-2 text-lg text-[#c9bedb]">
                An angry old man roasts your terrible YouTube taste so you close the tab.
              </p>
            </div>
          </div>
        </header>

        {/* form */}
        <form onSubmit={handleSubmit} noValidate className="mb-8">
          <label htmlFor="video-url" className="sr-only">
            YouTube URL
          </label>
          <div
            className={`flex flex-col gap-2.5 border-[3px] bg-[#251d36] p-2.5 shadow-[6px_6px_0_#0c0814] sm:flex-row ${
              dragActive ? "border-[#ffe66d]" : "border-[#0c0814] focus-within:border-[#ffe66d]"
            }`}
          >
            <input
              ref={urlRef}
              id="video-url"
              name="url"
              type="text"
              inputMode="url"
              placeholder="Paste that garbage YT link…"
              autoComplete="off"
              spellCheck={false}
              readOnly={loading}
              className="h-12 min-w-0 flex-1 border-2 border-white/12 bg-[#181224] px-4 text-lg text-[#fff7e8] placeholder:text-[#8f82a8] focus:border-[#ff8424] focus:outline-none"
            />
            <button
              type="submit"
              disabled={loading}
              className="font-pixel-display inline-flex h-12 shrink-0 items-center justify-center border-[3px] border-[#0c0814] bg-gradient-to-b from-[#ff8424] to-[#ff3b4e] px-5 text-sm font-bold text-white shadow-[3px_3px_0_#0c0814] [text-shadow:1px_1px_0_#0c0814] hover:brightness-110 active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0_#0c0814] disabled:opacity-55"
            >
              {loading ? <Loader2 className="size-5 animate-spin" /> : "ROAST ME!"}
            </button>
          </div>
        </form>

        {/* results */}
        {loading && <SkeletonRoast />}
        {roasts.length > 0 && <RoastCard roasts={roasts} videoId={videoId} />}

        {/* empty state */}
        {!loading && roasts.length === 0 && !error && (
          <div className="border-[3px] border-dashed border-[#ffe66d]/35 bg-[#251d36] px-7 py-10 text-center shadow-[6px_6px_0_#0c0814]">
            <p className="font-pixel-display text-sm text-[#ffe66d]">
              BACK IN MY DAY WE READ BOOKS!
            </p>
            <p className="mt-2.5 text-lg text-[#c9bedb]">
              Drop or paste a YouTube link above so I can talk you out of watching it.
            </p>
            <p className="font-pixel-display mt-3.5 text-xs text-[#ff8424]">
              SUPPORTS WATCH • YOUTU.BE • SHORTS
            </p>
          </div>
        )}
      </main>
    </>
  );
}
