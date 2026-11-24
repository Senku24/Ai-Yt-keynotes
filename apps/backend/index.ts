import express, { type ErrorRequestHandler, type Response } from "express";
import { rateLimit } from "express-rate-limit";
import { getEncoding } from "js-tiktoken";
import { generateKeynotes } from "./response";
import { requestSchema } from "./schema";
import { getTranscript, getYoutubeVideoId} from "./transcript";

import dotenv from "dotenv";
import cors from "cors"

dotenv.config()

const app = express()
const port = process.env.BACKEND_PORT 
const tokenizer = getEncoding("o200k_base");
let stage = "supadata";

app.use(express.json())
app.use(cors())


const maxConcurrentRequests = 8;
const maxTranscriptTokens = 12_000;
let activeRequests = 0;

function sendError(res: Response, status: number, code: string, message: string) {
  res.status(status).json({ error: { code, message } });
}


async function withDeadline<T>(
  requestSignal: AbortSignal,
  timeoutMs: number,
  run: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
  const deadline = AbortSignal.timeout(timeoutMs);
  const signal = AbortSignal.any([requestSignal, deadline]);

  try {
    const result = await run(signal);
    signal.throwIfAborted();
    return result;
  } catch (error) {
    if (deadline.aborted) {
      throw new DOMException("Provider deadline exceeded", "TimeoutError");
    }
    throw error;
  }
}

const notesRateLimit = rateLimit({
  windowMs: 60_000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: (_req, res) => {
    sendError(res, 429, "RATE_LIMITED", "Too many requests. Try again shortly.");
  },
});

//endpoints ------>>>>>>

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.post(["/keynotes", "/api/notes"], (_req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
},
notesRateLimit,
express.json({limit: "2kb"}),
async (req, res) => {
    const body = requestSchema.safeParse(req.body);
    const videoId = body.success ? getYoutubeVideoId(body.data.url) : null;

    if(!videoId) {
        sendError(res, 400, "INVALID_URL", "Invalid YouTube URL");
        return;
    }
    if (activeRequests >= maxConcurrentRequests) {
      res.set("Retry-After", "5");
      return sendError(res, 429, "RATE_LIMITED", "The service is busy. Try again shortly.");
    }

    const client = new AbortController();
    const handleClose = () => {
      if (!res.writableEnded) client.abort();
    };

    activeRequests++;
    res.once("close", handleClose);

    try {
      const transcript = await withDeadline(client.signal, 20_000, (signal) =>
        getTranscript(videoId, signal),
      );
      stage = "tokenizer";

      if (!transcript) {
        return sendError(
          res,
          422,
          "TRANSCRIPT_UNAVAILABLE",
          "Sorry, no English transcript is available for this video.",
        );
      }
      
      if (tokenizer.encode(transcript, [], []).length > maxTranscriptTokens) {
        return sendError(res, 413, "INPUT_TOO_LARGE", "Try a shorter video.");
      }
      stage = "openai";
      const keynotes = await withDeadline(client.signal, 12_000, (signal) =>
        generateKeynotes(transcript, signal),
      );

      if (!client.signal.aborted) {
        res.json({ videoId, keynotes });
      }
    } catch (error) {
        const details = error as {
        name?: string;
        status?: number;
        code?: string;
        } | null;

        console.error("[keynotes]", {
        stage,
        name: details?.name,
        status: details?.status,
        code: details?.code,
        });
      if (client.signal.aborted || res.destroyed) return;

      if (error instanceof DOMException && error.name === "TimeoutError") {
        return sendError(res, 504, "REQUEST_TIMEOUT", "The request timed out. Try again.");
      }

      sendError(res, 502, "UPSTREAM_ERROR", "Could not generate keynotes. Try again.");
    } finally {
      res.off("close", handleClose);
      activeRequests--;
    }
  },
);

const handleRequestError: ErrorRequestHandler = (error, _req, res, next) => {
  if (res.headersSent) return next(error);

  if (error?.type === "entity.too.large") {
    return sendError(res, 413, "INPUT_TOO_LARGE", "The request body exceeds 2 KB.");
  }

  if (error?.type === "entity.parse.failed") {
    return sendError(res, 400, "INVALID_URL", 'Send JSON with a "url" field.');
  }

  sendError(res, 500, "INTERNAL_ERROR", "An unexpected error occurred.");
};

app.use(handleRequestError);

app.listen(port, () => {
  console.log(`KeyNotes API listening on http://localhost:${port}`);
});