import z from "zod";

export const requestSchema = z.object({ url: z.string().trim().min(1) }).strict();
export const transcriptSchema = z.object({ content: z.string(), lang: z.string() });
export const notesSchema = z.object({
  keynotes: z.array(
    z.string().trim().min(1).refine((note) => note.split(/\s+/u).length <= 20),
  ).min(1).max(5),
}).strict();
