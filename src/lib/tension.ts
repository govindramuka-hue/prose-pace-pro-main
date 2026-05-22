// Heuristic narrative tension scoring. Free, deterministic, runs in browser.
// Scores each sentence 0-10 based on observable signals, then smooths into
// a curve and finds local maxima as "peaks".

const ACTION_VERBS = new Set([
  "ran","run","grabbed","grab","seized","slammed","crashed","exploded","screamed","shouted",
  "burst","leapt","leaped","fled","chased","killed","died","attacked","fought","punched",
  "stabbed","fired","shot","shattered","collapsed","vanished","escaped","fell","plunged",
  "raced","tore","ripped","struck","pounded","ripped","gasped","whispered","trembled",
  "shook","quivered","rushed","hurled","smashed","drowned","bled","sprinted",
]);

const STAKES_WORDS = new Set([
  "death","die","dying","dead","kill","blood","fear","afraid","terrified","panic",
  "danger","weapon","gun","knife","never","forever","last","only","must","cannot",
  "alone","silence","scream","cry","tears","heart","secret","truth","lie","betray",
  "trapped","escape","hope","lost","gone","end","final","forever","always",
]);

export interface TensionPoint {
  sentenceIdx: number;
  rawScore: number;
  score: number; // smoothed 0-10
  isPeak: boolean;
}

export function scoreSentences(sentences: string[]): TensionPoint[] {
  const raw = sentences.map(scoreSentence);
  const smoothed = smooth(raw, 3);
  // Normalize to 0-10
  const max = Math.max(0.001, ...smoothed);
  const normalized = smoothed.map(v => (v / max) * 10);
  // Find local maxima above threshold
  const peaks = findPeaks(normalized, 6.5, 8);
  const peakSet = new Set(peaks);
  return sentences.map((_, i) => ({
    sentenceIdx: i,
    rawScore: raw[i],
    score: normalized[i],
    isPeak: peakSet.has(i),
  }));
}

function scoreSentence(s: string): number {
  const words = s.toLowerCase().split(/\s+/).filter(Boolean);
  const wc = words.length || 1;
  let score = 0;

  // Short sentences = punchy = tension
  if (wc <= 5) score += 2.5;
  else if (wc <= 9) score += 1.2;

  // Punctuation
  const exclam = (s.match(/!/g) || []).length;
  const question = (s.match(/\?/g) || []).length;
  const ellipsis = (s.match(/\.{3}|…/g) || []).length;
  const dash = (s.match(/—|–/g) || []).length;
  score += exclam * 2 + question * 1.2 + ellipsis * 1 + dash * 0.6;

  // Dialogue (quotes)
  const hasDialogue = /["'""]/.test(s);
  if (hasDialogue) score += 0.8;

  // Action verbs and stakes words
  let actionHits = 0, stakesHits = 0;
  for (const w of words) {
    const clean = w.replace(/[^a-z]/g, "");
    if (ACTION_VERBS.has(clean)) actionHits++;
    if (STAKES_WORDS.has(clean)) stakesHits++;
  }
  score += actionHits * 1.5 + stakesHits * 1.0;

  // ALL CAPS shouting
  const capsWords = (s.match(/\b[A-Z]{3,}\b/g) || []).length;
  score += capsWords * 1.2;

  return score;
}

function smooth(values: number[], window: number): number[] {
  return values.map((_, i) => {
    let sum = 0, n = 0;
    for (let k = -window; k <= window; k++) {
      const j = i + k;
      if (j >= 0 && j < values.length) {
        const weight = 1 - Math.abs(k) / (window + 1);
        sum += values[j] * weight;
        n += weight;
      }
    }
    return n > 0 ? sum / n : 0;
  });
}

function findPeaks(scores: number[], minScore: number, minDistance: number): number[] {
  const peaks: number[] = [];
  for (let i = 1; i < scores.length - 1; i++) {
    if (scores[i] >= minScore && scores[i] > scores[i - 1] && scores[i] >= scores[i + 1]) {
      if (peaks.length === 0 || i - peaks[peaks.length - 1] >= minDistance) {
        peaks.push(i);
      }
    }
  }
  return peaks;
}

// Find next peak after a given sentence index
export function nextPeak(points: TensionPoint[], fromIdx: number): TensionPoint | null {
  for (let i = fromIdx + 1; i < points.length; i++) {
    if (points[i].isPeak) return points[i];
  }
  return null;
}

// True if a sentence is meaningful enough to surface in a recap.
function isRecapWorthy(s: string | undefined): boolean {
  if (!s) return false;
  const t = s.trim();
  const words = t.split(/\s+/).filter(Boolean);
  if (words.length < 5) return false;
  if (words.length > 60) return false;
  const letters = (t.match(/[a-zA-Z]/g) || []).length;
  if (letters / Math.max(1, t.length) < 0.6) return false;
  // Skip obvious noise
  if (/https?:\/\/|www\./i.test(t)) return false;
  if (/\b(isbn|copyright|©|all rights reserved|printed in|published by)\b/i.test(t)) return false;
  // Skip lines that look like headings / TOC entries (mostly Title Case, no end punct)
  if (!/[.!?]$/.test(t) && words.length < 10) return false;
  return true;
}

// Pick the top N sentences in a range — used for extractive recap
export function topSentences(
  points: TensionPoint[],
  fromIdx: number,
  toIdx: number,
  n: number,
  sentences?: string[]
): number[] {
  const slice = points
    .slice(fromIdx, toIdx)
    .filter(p => !sentences || isRecapWorthy(sentences[p.sentenceIdx]))
    .map(p => ({ idx: p.sentenceIdx, s: p.score }));
  slice.sort((a, b) => b.s - a.s);
  return slice.slice(0, n).map(x => x.idx).sort((a, b) => a - b);
}
