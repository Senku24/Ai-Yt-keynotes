import { transcriptSchema } from "./schema";

const apiKey = process.env.SUPADATA_YT_API_KEY?.trim();

if (!apiKey) {
  throw new Error("SUPADATA_YT_API_KEY is missing");
}

const youtubeHosts = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
]);

export function getYoutubeVideoId(input: string) {
    let url : URL;

    url = new URL(input);
    if(!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.port) {
        return null;
        
    }
    const pathName = url.pathname.replace(/\/$/, "");
    let videoId: string | null = null;
    if( url.hostname === "youtu.be"){
        videoId = pathName.slice(1);
    } else if(youtubeHosts.has(url.hostname)) {
        videoId = pathName === "/watch" ? url.searchParams.get("v") : /^\/shorts\/([^/]+)$/.exec(pathName)?.[1] ?? null;
    }
    return videoId && /^[A-Za-z0-9_-]{11}$/.test(videoId) ? videoId : null;
}

export async function getTranscript(videoId: string, signal: AbortSignal) {
    const url = new URL ("https://api.supadata.ai/v1/transcript");
    url.search = new URLSearchParams({
        url: `https://www.youtube.com/watch?v=${videoId}`,
        mode: "native",
        text: "true",
        lang: "en",
    }).toString();
    const response = await fetch( url , {
        headers: { "x-api-key": apiKey! },
        redirect: "error",
        signal,
    });

    if (response.status !== 200) {
    await response.body?.cancel();

    if (response.status === 206) return null;

    throw Object.assign(new Error("Supadata request failed"), {
    status: response.status,
    });
    }

    const { content, lang } = transcriptSchema.parse( await response.json() );
    if (!/^en(?:-|$)/i.test(lang)) return null;
    return content.trim() || null;
}