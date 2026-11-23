import express , { Router, type ErrorRequestHandler } from "express"
import dotenv from "dotenv"
import { rateLimit } from "express-rate-limit";
import { getEncoding } from "js-tiktoken";
import OpenAI from "openai";
import { z } from "zod";
import cors from "cors"

dotenv.config()

const app = express()
const port = process.env.BACKEND_PORT 

app.use(express.json())
app.use(cors())

const supadataKey = process.env.SUPADATA_YT_API_KEY;
const openaiKey = process.env.OPENAI_API_KEY;
const openaiModel = process.env.OPENAI_MODEL;

if (!supadataKey || !openaiKey) {
  throw new Error("Set SUPADATA_YT_API_KEY and OPENAI_API_KEY in .env");
}

//endpoints ------>>>>>>

app.post("/keynotes", (req, res) => {
    
})

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`)
})