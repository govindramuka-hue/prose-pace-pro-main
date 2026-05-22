// Convert an IngestResult into a complete DocRecord (segment, score, save).
import type { DocRecord, DocPage } from "./db";
import { saveDoc } from "./db";
import { segmentSentences } from "./sentence-segmenter";
import { scoreSentences } from "./tension";
import type { IngestResult } from "./ingestion";

export async function buildAndSaveDoc(
  ing: IngestResult,
  options: { title?: string; folder?: string } = {}
): Promise<DocRecord> {
  const rawSentences = segmentSentences(ing.text);
  const sectionTitles = detectSectionTitles(rawSentences);
  const sectionSourceIdx = new Set(sectionTitles.map(item => item.sentenceIdx));
  const indexMap = new Map<number, number>();
  const sentences = rawSentences.filter((sentence, rawIdx) => {
    if (sectionSourceIdx.has(rawIdx)) return false;
    indexMap.set(rawIdx, indexMap.size);
    return true;
  });
  const mappedSectionTitles = sectionTitles
    .map(section => {
      let idx = section.sentenceIdx;
      while (idx < rawSentences.length && !indexMap.has(idx)) idx++;
      return { title: section.title, sentenceIdx: indexMap.get(idx) ?? 0 };
    })
    .filter((section, i, all) => section.title && all.findIndex(item => item.title === section.title && item.sentenceIdx === section.sentenceIdx) === i);
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
    title: options.title?.trim() || ing.title || "Untitled",
    folder: options.folder?.trim() || undefined,
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
    kind: classifyDocument(rawSentences),
    sectionTitles: mappedSectionTitles,
  };

  await saveDoc(doc);
  return doc;
}

function classifyDocument(sentences: string[]): DocRecord["kind"] {
  const sample = sentences.slice(0, 120).join(" ").toLowerCase();
  const studySignals = ["abstract", "introduction", "method", "results", "equation", "figure", "table", "theorem", "proof", "references", "doi"];
  const hits = studySignals.filter(signal => sample.includes(signal)).length;
  if (hits >= 3) return "study";
  if (sentences.some(s => /^\s*(definition|theorem|lemma|proof|example)\b/i.test(s))) return "study";
  return "narrative";
}

function detectSectionTitles(sentences: string[]) {
  return sentences
    .map((sentence, sentenceIdx) => ({ sentenceIdx, title: sentence.trim() }))
    .filter(({ title }) => isSectionHeading(title))
    .slice(0, 120);
}

function isSectionHeading(title: string) {
  const words = title.split(/\s+/).filter(Boolean);
  return (
    title.length >= 3 &&
    title.length <= 90 &&
    words.length <= 10 &&
    !/[.!?]$/.test(title) &&
    (
      /^(chapter|part|section|abstract|introduction|conclusion|references|appendix|preface|prologue|epilogue|contents|summary|method|methods|results|discussion)\b/i.test(title) ||
      title === title.toUpperCase()
    )
  );
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
