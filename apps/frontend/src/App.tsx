import axios from "axios";
import { BookOpen, Clipboard, Loader2, Sparkles } from "lucide-react";
import { useCallback, useRef, useState, type FormEvent } from "react";
import { Button } from "./components/ui/button.tsx";
import { Input } from "./components/ui/input.tsx";
import "./index.css";

type ApiError = {
  error?: { code?: string; message?: string };
};

const isLocal = ["localhost", "127.0.0.1"].includes(window.location.hostname);
const endpoint = isLocal ? "http://localhost:3001/keynotes" : "/keynotes";

/* ── toast ─────────────────────────────────────────────────── */
function Toast({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div
      role="alert"
      className="animate-in slide-in-from-top-2 fade-in fixed left-1/2 top-6 z-50 -translate-x-1/2 rounded-lg border border-red-200/30 bg-red-950/80 px-5 py-3 text-sm font-medium text-red-200 shadow-lg backdrop-blur-md"
    >
      <div className="flex items-center gap-3">
        <span>{message}</span>
        <button onClick={onDismiss} className="text-red-300/70 hover:text-red-100" aria-label="Dismiss">
          ✕
        </button>
      </div>
    </div>
  );
}

/* ── skeleton loader ───────────────────────────────────────── */
function SkeletonBullets() {
  return (
    <div className="space-y-3" aria-label="Loading keynotes">
      {[80, 65, 90, 55, 72].map((w, i) => (
        <div key={i} className="flex items-start gap-3">
          <div className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-white/20" />
          <div className="h-4 rounded bg-white/10 animate-pulse" style={{ width: `${w}%` }} />
        </div>
      ))}
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
      setTimeout(() => setCopied(false), 2000);
    });
  }, [notes]);

  return (
    <section aria-labelledby="notes-heading" className="relative rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="size-4 text-white/50" />
          <h2 id="notes-heading" className="text-sm font-semibold uppercase tracking-widest text-white/60">
            Keynotes
          </h2>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleCopy}
          className="text-white/40 hover:text-white/80"
          aria-label="Copy keynotes"
        >
          <Clipboard className="size-3.5" />
        </Button>
      </div>

      <ul className="space-y-3">
        {notes.map((note, index) => (
          <li key={`${index}-${note}`} className="flex items-start gap-3 text-[15px] leading-relaxed text-white/90">
            <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-white/40" />
            {note}
          </li>
        ))}
      </ul>

      {copied && (
        <div className="animate-in fade-in absolute right-6 top-6 rounded bg-white/10 px-2 py-1 text-xs text-white/70">
          Copied!
        </div>
      )}

      <a
        href={`https://www.youtube.com/watch?v=${videoId}`}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 block text-xs text-white/30 hover:text-white/50 transition-colors"
      >
        Source video →
      </a>
    </section>
  );
}

/* ── main app ──────────────────────────────────────────────── */
export default function App() {
  const urlRef = useRef<HTMLInputElement>(null);
  const [notes, setNotes] = useState<string[]>([]);
  const [videoId, setVideoId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const url = urlRef.current?.value.trim();
    if (!url || loading) return;

    setLoading(true);
    setError("");
    setNotes([]);
    setVideoId("");

    try {
      const { data } = await axios.post(endpoint, { url });
      setNotes(data.keynotes);
      setVideoId(data.videoId);
    } catch (err) {
      const failure = axios.isAxiosError(err)
        ? (err.response?.data as ApiError)?.error
        : null;
      setError(
        failure?.code === "TRANSCRIPT_UNAVAILABLE"
          ? "Sorry, no transcript is available for this video."
          : failure?.message ?? "Could not generate keynotes. Try again."
      );
    } finally {
      setLoading(false);
    }
  }

  /* ── drag & drop ─────────────────────────── */
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const text = e.dataTransfer.getData("text/plain")?.trim();
      if (text && urlRef.current) {
        urlRef.current.value = text;
        urlRef.current.form?.requestSubmit();
      }
    },
    []
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  return (
    <>
      {error && <Toast message={error} onDismiss={() => setError("")} />}

      <main
        className="mx-auto flex min-h-dvh max-w-xl flex-col px-5 py-16 sm:py-24"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        {/* header */}
        <div className="mb-10">
          <div className="mb-3 flex items-center gap-2.5">
            <Sparkles className="size-6 text-white/70" />
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">KeyNotes</h1>
          </div>
          <p className="text-sm text-white/50">
            Paste a YouTube link. Get the five key takeaways.
          </p>
        </div>

        {/* form */}
        <form onSubmit={handleSubmit} className="mb-8">
          <div className="flex gap-2">
            <Input
              ref={urlRef}
              id="video-url"
              name="url"
              type="url"
              placeholder="https://youtu.be/…"
              autoComplete="off"
              readOnly={loading}
              required
              className="flex-1 border-white/10 bg-white/[0.06] text-white placeholder:text-white/30 focus-visible:border-white/25 focus-visible:ring-white/10"
            />
            <Button
              type="submit"
              disabled={loading}
              className="shrink-0 bg-white text-black hover:bg-white/90 disabled:opacity-40"
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
          <div className="mt-8 flex flex-1 items-start justify-center">
            <p className="text-center text-sm text-white/20">
              Drop or paste a YouTube link above to get started.
            </p>
          </div>
        )}
      </main>
    </>
  );
}
