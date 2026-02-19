import fs from "node:fs";
import path from "node:path";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import { DATASET_DOCS } from "./dataset-docs.mjs";

function chunkText(text, maxChars = 1400, overlap = 250) {
  const cleaned = String(text || "").replace(/\s+/g, " ").trim();
  if (!cleaned) return [];
  const chunks = [];
  let i = 0;
  while (i < cleaned.length) {
    const end = Math.min(cleaned.length, i + maxChars);
    chunks.push(cleaned.slice(i, end));
    if (end === cleaned.length) break;
    i = Math.max(0, end - overlap);
  }
  return chunks;
}

function tokenize(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(t => t.length >= 2);
}

async function extractPages(pdfPath) {
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const pdf = await pdfjs.getDocument({ data }).promise;
  const pages = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const strings = content.items
      .map((it) => (typeof it.str === "string" ? it.str : ""))
      .filter(Boolean);
    pages.push(strings.join(" "));
  }
  return pages;
}

export async function buildIndex(outDir) {
  fs.mkdirSync(outDir, { recursive: true });

  const chunks = [];
  const df = {}; // document frequency by token
  let N = 0;

  for (const doc of DATASET_DOCS) {
    const fullPath = path.join(process.cwd(), "data", "pdfs", doc.file);
    if (!fs.existsSync(fullPath)) {
      console.error(`❌ Missing PDF: ${fullPath}`);
      continue;
    }

    console.log(`📄 Indexing: ${doc.title}`);
    const pages = await extractPages(fullPath);

    for (let p = 0; p < pages.length; p++) {
      const pageChunks = chunkText(pages[p]);

      for (let c = 0; c < pageChunks.length; c++) {
        const text = pageChunks[c];
        const tokens = tokenize(text);
        const tf = {};
        for (const t of tokens) tf[t] = (tf[t] || 0) + 1;

        // update DF once per chunk
        const seen = new Set(tokens);
        for (const t of seen) df[t] = (df[t] || 0) + 1;

        chunks.push({
          docId: doc.id,
          docTitle: doc.title,
          file: doc.file,
          page: p + 1,
          chunkId: `${doc.id}-p${p + 1}-c${c}`,
          text,
          tf,
          len: tokens.length,
        });

        N++;
      }
    }
  }

  const indexPath = path.join(outDir, "index.json");
  fs.writeFileSync(
    indexPath,
    JSON.stringify({ createdAt: new Date().toISOString(), N, df, chunks })
  );

  console.log(`✅ Wrote lexical index: ${indexPath}`);
}
