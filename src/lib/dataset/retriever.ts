import fs from "node:fs/promises";
import path from "node:path";

export type IndexedChunk = {
  id: string;
  title: string;
  chunk: string;
  source?: string;
  score?: number;
};

function simpleScore(query: string, text: string) {
  const q = query.toLowerCase().split(/\s+/).filter(Boolean);
  const t = text.toLowerCase();
  let score = 0;
  for (const w of q) {
    if (w.length < 3) continue;
    if (t.includes(w)) score += 1;
  }
  return score;
}

export async function retrieve(query: string, k = 6): Promise<IndexedChunk[]> {
  if (!query.trim()) return [];

  const indexPath = path.join(process.cwd(), "data", "index", "index.json");
  const rawText = await fs.readFile(indexPath, "utf8");
  const parsed = JSON.parse(rawText);

  const chunks = parsed?.chunks;
  if (!Array.isArray(chunks)) {
    throw new Error("Index missing `chunks` array. Expected { createdAt, N, df, chunks: [...] }");
  }

  return chunks
    .map((c: any, i: number) => {
      const title =
        typeof c.title === "string"
          ? c.title
          : typeof c.docTitle === "string"
            ? c.docTitle
            : typeof c.file === "string"
              ? c.file
          : typeof c.source === "string"
            ? c.source
            : "Guideline";

      const chunk =
        typeof c.chunk === "string"
          ? c.chunk
          : typeof c.text === "string"
            ? c.text
            : "";

      const id =
        typeof c.id === "string"
          ? c.id
          : `${title.replace(/\s+/g, "-").toLowerCase()}-${i}`;

      return {
        id,
        title,
        chunk,
        source:
          typeof c.source === "string"
            ? c.source
            : typeof c.file === "string"
              ? c.file
              : typeof c.docId === "string"
                ? c.docId
                : undefined,
        score: simpleScore(query, `${title}\n${chunk}`)
      } as IndexedChunk;
    })
    .filter((c: IndexedChunk) => (c.score ?? 0) > 0 && c.chunk.trim().length > 0)
    .sort((a: IndexedChunk, b: IndexedChunk) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, k);
}
