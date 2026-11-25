import axios from "axios";
import { useRef, useState, type FormEvent } from "react";
import { Button } from "./components/ui/button.tsx";
import { Input } from "./components/ui/input.tsx";
import "./index.css";

type NotesResponse = {
  videoId: string;
  keynotes: string[];
};

type ApiError = {
  error?: { code?: string; message?: string };
};

const isLocal = ["localhost", "127.0.0.1"].includes(window.location.hostname);
const endpoint = isLocal ? "http://localhost:3001/keynotes" : "/keynotes";

export default function App() {
    const urlRef = useRef<HTMLInputElement>(null);
    const [notes, setNotes] = useState<string[]>([]);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const url = urlRef.current?.value.trim();
        if (!url || loading) return;

        setLoading(true);
        setError("");
        setNotes([]);

        try {
            const { data } = await axios.post(endpoint, { url });
            setNotes(data.keynotes);
        } catch( error ) {
            const failure = axios.isAxiosError(error) ? error.response?.data : error;
            setError(
            failure?.code === "TRANSCRIPT_UNAVAILABLE"
            ? "Sorry, no transcript is available for this video."
            : failure?.message ?? "Could not generate keynotes. Try again.",
        );
        } finally {
        setLoading(false);
        }
        }
    
    return (
        <main className="mx-auto max-w-2xl space-y-6 px-4 py-12">
        <h1 className="text-3xl font-semibold tracking-tight">YouTube KeyNotes</h1>

        <form onSubmit={handleSubmit} className="space-y-2">
            <label htmlFor="video-url" className="text-sm font-medium">
            YouTube URL
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
            <Input
                ref={urlRef}
                id="video-url"
                name="url"
                type="url"
                placeholder="https://youtu.be/…"
                autoComplete="off"
                readOnly={loading}
                required
            />
            <Button type="submit" disabled={loading}>
                Generate
            </Button>
            </div>
        </form>

        <p role="status">{loading ? "Generating keynotes…" : ""}</p>
        {error && (
            <p role="alert" className="text-sm text-destructive">
            {error}
            </p>
        )}

        {notes.length > 0 && (
            <section aria-labelledby="notes-heading" className="space-y-2">
            <h2 id="notes-heading" className="text-lg font-semibold">Keynotes</h2>
            <ul className="list-disc space-y-2 pl-5">
                {notes.map((note, index) => (
                <li key={`${index}-${note}`}>{note}</li>
                ))}
            </ul>
            </section>
        )}
        </main>
    );
    }