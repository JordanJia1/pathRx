cat > lib/dataset/retriever.ts <<'EOF'
import { loadIndex } from "./store";

function tokenize(s: string): string[] {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(t => t.length >= 2);
}

export type Evidence = {
  docTitle: string;
  page: number;
  excerpt: string;
  score: number;
};

export async function retrieveEvidence(query: string, k = 4): Promise<Evidence[]> {
  const idx = loadIndex();
  const qTokens = tokenize(query);

  // BM25-ish params
  const k1 = 1.2;
  const b = 0.75;
  const avgLen = idx.chunks.reduce((s, c) => s + (c.len || 0), 0) / Math.max(1, idx.chunks.length);

  const scored = idx.chunks.map((ch) => {
    let score = 0;
    for (const t of qTokens) {
      const tf = ch.tf?.[t] || 0;
      if (!tf) continue;

      const df = idx.df?.[t] || 0;
      const idf = Math.log(1 + (idx.N - df + 0.5) / (df + 0.5));

      const denom = tf + k1 * (1 - b + b * (ch.len / avgLen));
      score += idf * ((tf * (k1 + 1)) / denom);
    }
    return { ch, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, k).filter(x => x.score > 0);

  return top.map(({ ch, score }) => ({
    docTitle: ch.docTitle,
    page: ch.page,
    excerpt: ch.text.length > 380 ? ch.text.slice(0, 380) + "…" : ch.text,
    score,
  }));
}
EOF
