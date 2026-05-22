// Convert an IngestResult into a complete DocRecord (segment, score, save).
import type { DocRecord, DocPage } from "./db";
import { saveDoc } from "./db";
import { segmentSentences } from "./sentence-segmenter";
import { scoreSentences } from "./tension";
import type { IngestResult } from "./ingestion";

export async function buildAndSaveDoc(ing: IngestResult): Promise<DocRecord> {
  const sentences = segmentSentences(ing.text);
  const tensionPoints = scoreSentences(sentences);
  const tensionScores = tensionPoints.map(p => p.score);
  const peaks = tensionPoints.filter(p => p.isPeak).map(p => p.sentenceIdx);

  // Map per-page raw text → sentence index ranges by aligning prefixes
  let pages: DocPage[] | undefined;
  if (ing.pages && ing.pages.length > 0) {
    pages = computePageRanges(ing.pages, sentences);
  }

  const wordCount = sentences.reduce((n, s) => n + s.split(/\s+/).length, 0);
  const id = cryptoId();

  const doc: DocRecord = {
    id,
    title: ing.title || "Untitled",
    source: ing.source,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    wordCount,
    sentenceCount: sentences.length,
    sentences,
    pages,
    totalPages: ing.totalPages,
    tensionScores,
    peaks,
    coverHue: hashHue(ing.title),
  };

  await saveDoc(doc);
  return doc;
}

function computePageRanges(rawPages: string[], sentences: string[]): DocPage[] {
  // Approximate: we know total words per page, so we can split sentences proportionally.
  const wordsPerPage = rawPages.map(p => p.split(/\s+/).filter(Boolean).length);
  const totalWords = wordsPerPage.reduce((a, b) => a + b, 0) || 1;
  const sentenceWords = sentences.map(s => s.split(/\s+/).length);
  const totalSentenceWords = sentenceWords.reduce((a, b) => a + b, 0) || 1;
  const scale = totalSentenceWords / totalWords;

  const pages: DocPage[] = [];
  let sIdx = 0;
  let wordsSoFar = 0;
  for (let p = 0; p < rawPages.length; p++) {
    const targetWords = (wordsPerPage[p] * scale);
    const start = sIdx;
    let acc = 0;
    while (sIdx < sentences.length && acc < targetWords) {
      acc += sentenceWords[sIdx];
      sIdx++;
    }
    pages.push({ pageNumber: p + 1, startSentenceIdx: start, endSentenceIdx: sIdx });
    wordsSoFar += acc;
  }
  // Make sure the last page captures any remaining sentences
  if (pages.length && sIdx < sentences.length) {
    pages[pages.length - 1].endSentenceIdx = sentences.length;
  }
  return pages;
}

function cryptoId(): string {
  const arr = new Uint8Array(8);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, "0")).join("");
}

function hashHue(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h) % 360;
}

export function findPageForSentence(pages: DocPage[] | undefined, sentenceIdx: number): number | null {
  if (!pages) return null;
  for (const p of pages) {
    if (sentenceIdx >= p.startSentenceIdx && sentenceIdx < p.endSentenceIdx) return p.pageNumber;
  }
  return pages[pages.length - 1]?.pageNumber ?? null;
}
