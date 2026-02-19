cat > lib/dataset/store.ts <<'EOF'
import fs from "node:fs";
import path from "node:path";

export type IndexedChunk = {
  docId: string;
  docTitle: string;
  file: string;
  page: number;
  chunkId: string;
  text: string;
  tf: Record<string, number>;
  len: number;
};

export type LexicalIndex = {
  createdAt: string;
  N: number;
  df: Record<string, number>;
  chunks: IndexedChunk[];
};

let cache: LexicalIndex | null = null;

export function loadIndex(): LexicalIndex {
  if (cache) return cache;
  const p = path.join(process.cwd(), "data", "index", "index.json");
  const raw = JSON.parse(fs.readFileSync(p, "utf-8")) as LexicalIndex;
  cache = raw;
  return cache;
}
EOF
