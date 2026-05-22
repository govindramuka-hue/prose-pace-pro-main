// Context-aware chunker for the reader.
// Splits a chapter's scene-text into "blocks" the reader displays one at a time.
// Block types decide rendering: narrative, dialogue, quote.
//
// Goals:
// • Each narrative block is 9–18 words, broken at natural points (., ; : , — and conjunctions).
// • Dialogue is shown one quote at a time, attribution ("he said") appended to that block.
// • Multi-line block-quote-style indented passages are kept intact (rendered as a quote card).
// • Never strand a tail < 4 words — merge it back.

export type BlockType = "narrative" | "dialogue" | "quote";
export interface Block {
  text: string;
  type: BlockType;
  isParagraphEnd: boolean;
}

const TARGET_MIN = 9;
const TARGET_MAX = 18;
const MIN_TAIL = 4;

const BREAK_PUNCT = new Set([",", ";", ":", "—", "–"]);
const STRONG_PUNCT = new Set([".", "!", "?"]);
const SOFT_CONJ = new Set([
  "and", "but", "or", "yet", "because", "although", "though",
  "while", "whereas", "since", "if", "when", "as", "until",
]);

const ABBREV = new Set([
  "mr","mrs","ms","dr","prof","sr","jr","st","mt","rev",
  "vs","etc","e.g","i.e","u.s","u.k","p.s","ph.d","m.d",
]);

// Detect a paragraph that is "obviously a quoted block" (e.g., letters, monologues).
// We treat any paragraph that opens with a quote and runs > 60 words as a quote block.
function isLongQuoteParagraph(p: string): boolean {
  const open = /^[\s]*[\u201C"']/.test(p);
  const wc = p.split(/\s+/).length;
  return open && wc > 60;
}

// Detect dialogue: a paragraph containing one or more quoted strings with attribution.
function paragraphContainsDialogue(p: string): boolean {
  return /[\u201C"][^\u201C\u201D"]{2,}[\u201D"]/.test(p);
}

// Split a paragraph into sentences while respecting abbreviations & quotes.
function splitSentences(para: string): string[] {
  const out: string[] = [];
  let buf = "";
  for (let i = 0; i < para.length; i++) {
    const c = para[i];
    buf += c;
    if (c === "." || c === "!" || c === "?") {
      // include trailing closing quotes / parens
      let j = i + 1;
      while (j < para.length && /["'\u201D)]/.test(para[j])) {
        buf += para[j];
        j++;
      }
      const tail = para.slice(j).trimStart();
      const lastWord = (buf.match(/(\S+)\.\s*$/) || [])[1]?.toLowerCase().replace(/[^a-z.]/g, "");
      const isAbbr = lastWord && ABBREV.has(lastWord.replace(/\.$/, ""));
      const followsCapital = tail.length === 0 || /^[A-Z\u201C"'(\[]/.test(tail);
      if (!isAbbr && followsCapital) {
        out.push(buf.trim());
        buf = "";
        i = j - 1;
      }
    }
  }
  if (buf.trim()) out.push(buf.trim());
  return out;
}

// Extract dialogue + attribution as separate "dialogue" blocks.
// Anything outside a quote in a dialogue paragraph becomes "narrative".
function chunkDialogueParagraph(para: string): { text: string; type: BlockType }[] {
  const blocks: { text: string; type: BlockType }[] = [];
  // Greedy match: "quoted text," he said.   OR    "quoted text!" she shouted.
  const re = /([\u201C"][^\u201C\u201D"]+[\u201D"][^\u201C"]*?(?:[.!?](?=\s|$)|$))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(para)) !== null) {
    if (m.index > last) {
      const interstitial = para.slice(last, m.index).trim();
      if (interstitial) blocks.push({ text: interstitial, type: "narrative" });
    }
    blocks.push({ text: m[0].trim(), type: "dialogue" });
    last = re.lastIndex;
  }
  if (last < para.length) {
    const tail = para.slice(last).trim();
    if (tail) blocks.push({ text: tail, type: "narrative" });
  }
  // If nothing matched (regex missed), fall back to whole paragraph as narrative.
  if (blocks.length === 0) blocks.push({ text: para.trim(), type: "narrative" });
  return blocks;
}

// Take a long narrative string and break at natural points to land in TARGET_MIN..TARGET_MAX.
function breakNarrative(text: string): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length <= TARGET_MAX) return [text.trim()];

  const out: string[] = [];
  let cur: string[] = [];

  const flush = () => {
    if (cur.length === 0) return;
    out.push(cur.join(" "));
    cur = [];
  };

  for (let i = 0; i < words.length; i++) {
    cur.push(words[i]);
    const w = words[i];
    const last = w.slice(-1);
    const next = words[i + 1]?.toLowerCase().replace(/[^a-z]/g, "");
    const remaining = words.length - 1 - i;

    const atStrong = STRONG_PUNCT.has(last);
    const atBreak = BREAK_PUNCT.has(last);
    const atSoftConj = next && SOFT_CONJ.has(next);

    const longEnough = cur.length >= TARGET_MIN;
    const tooLong = cur.length >= TARGET_MAX;

    // Best break: strong punct + long enough
    if (atStrong && longEnough) {
      // Don't strand a tiny remainder
      if (remaining > 0 && remaining < MIN_TAIL) continue;
      flush();
      continue;
    }
    // Good break: comma/semi/dash + long enough
    if (atBreak && longEnough) {
      if (remaining > 0 && remaining < MIN_TAIL) continue;
      flush();
      continue;
    }
    // Soft break: before a conjunction, but only if we're > halfway to max
    if (atSoftConj && cur.length >= Math.floor((TARGET_MIN + TARGET_MAX) / 2)) {
      if (remaining > 0 && remaining < MIN_TAIL) continue;
      flush();
      continue;
    }
    // Forced break: walk back to the nearest comma; if none, hard-cut
    if (tooLong) {
      let backIdx = cur.length - 1;
      while (backIdx > TARGET_MIN) {
        if (BREAK_PUNCT.has(cur[backIdx].slice(-1))) break;
        backIdx--;
      }
      if (backIdx > TARGET_MIN) {
        const chunk = cur.slice(0, backIdx + 1).join(" ");
        out.push(chunk);
        cur = cur.slice(backIdx + 1);
      } else {
        flush();
      }
    }
  }
  if (cur.length) {
    if (out.length && cur.length < MIN_TAIL) {
      out[out.length - 1] += " " + cur.join(" ");
    } else {
      out.push(cur.join(" "));
    }
  }
  return out.map(s => s.trim()).filter(Boolean);
}

export function chunkScene(sceneText: string): Block[] {
  const paragraphs = sceneText.split(/\n{2,}/).map(p => p.replace(/\n/g, " ").replace(/\s+/g, " ").trim()).filter(Boolean);
  const blocks: Block[] = [];

  for (let pi = 0; pi < paragraphs.length; pi++) {
    const para = paragraphs[pi];
    const isLast = pi === paragraphs.length - 1;

    // CASE 1: Long quoted block (letter, monologue) — preserve intact.
    if (isLongQuoteParagraph(para)) {
      // Split into sentences but keep them under one "quote" header.
      const sentences = splitSentences(para);
      for (let si = 0; si < sentences.length; si++) {
        const parts = breakNarrative(sentences[si]);
        for (let bi = 0; bi < parts.length; bi++) {
          blocks.push({
            text: parts[bi],
            type: "quote",
            isParagraphEnd: si === sentences.length - 1 && bi === parts.length - 1,
          });
        }
      }
      continue;
    }

    // CASE 2: Dialogue paragraph — extract each quote separately.
    if (paragraphContainsDialogue(para)) {
      const segs = chunkDialogueParagraph(para);
      for (let si = 0; si < segs.length; si++) {
        const seg = segs[si];
        const isLastSeg = si === segs.length - 1;
        if (seg.type === "dialogue") {
          // Keep dialogue intact unless very long
          const parts = seg.text.split(/\s+/).length > TARGET_MAX * 1.5
            ? breakNarrative(seg.text)
            : [seg.text];
          for (let bi = 0; bi < parts.length; bi++) {
            blocks.push({
              text: parts[bi],
              type: "dialogue",
              isParagraphEnd: isLastSeg && bi === parts.length - 1,
            });
          }
        } else {
          const sentences = splitSentences(seg.text);
          for (let sj = 0; sj < sentences.length; sj++) {
            const parts = breakNarrative(sentences[sj]);
            for (let bi = 0; bi < parts.length; bi++) {
              blocks.push({
                text: parts[bi],
                type: "narrative",
                isParagraphEnd: isLastSeg && sj === sentences.length - 1 && bi === parts.length - 1,
              });
            }
          }
        }
      }
      continue;
    }

    // CASE 3: Plain narrative paragraph.
    const sentences = splitSentences(para);
    for (let si = 0; si < sentences.length; si++) {
      const parts = breakNarrative(sentences[si]);
      for (let bi = 0; bi < parts.length; bi++) {
        blocks.push({
          text: parts[bi],
          type: "narrative",
          isParagraphEnd: si === sentences.length - 1 && bi === parts.length - 1,
        });
      }
    }
  }

  return blocks;
}

// Compute an entire chapter's blocks as a flat list, with which scene each came from.
export function chunkChapter(scenes: { text: string }[]): Array<Block & { sceneIdx: number }> {
  const out: Array<Block & { sceneIdx: number }> = [];
  scenes.forEach((s, idx) => {
    chunkScene(s.text).forEach(b => out.push({ ...b, sceneIdx: idx }));
  });
  return out;
}

// Pacing: estimate display time for a block in ms.
export function estimateBlockMs(text: string, baseWpm: number, isParagraphEnd: boolean): number {
  const words = text.split(/\s+/).length;
  const msPerWord = 60000 / baseWpm;
  const last = text.slice(-1);
  let ms = words * msPerWord * 1.05;
  if (STRONG_PUNCT.has(last)) ms += 380;
  else if (BREAK_PUNCT.has(last)) ms += 180;
  else ms += 90;
  if (isParagraphEnd) ms += 280;
  return Math.max(550, ms);
}
