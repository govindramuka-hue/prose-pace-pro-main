// Sentence segmentation that respects abbreviations, plus breath-unit splitting
// for long sentences. Zero dependencies, runs in browser.

const ABBREVIATIONS = new Set([
  "mr", "mrs", "ms", "dr", "prof", "sr", "jr", "st", "mt", "rev",
  "vs", "etc", "e.g", "i.e", "u.s", "u.k", "p.s", "ph.d", "m.d",
  "inc", "ltd", "co", "corp", "no", "vol", "ch", "fig", "pg", "pp",
  "jan", "feb", "mar", "apr", "jun", "jul", "aug", "sep", "sept", "oct", "nov", "dec",
]);

export function segmentSentences(text: string): string[] {
  if (!text) return [];
  const cleaned = text.replace(/\r\n/g, "\n").replace(/[\t ]+/g, " ");
  const paragraphs = cleaned.split(/\n{2,}/).map(p => p.replace(/\n/g, " ").trim()).filter(Boolean);

  const out: string[] = [];
  for (const para of paragraphs) {
    const sentences = splitParagraph(para);
    out.push(...sentences);
  }
  // Final scrub: drop any junk-looking sentences
  return out.filter(isReadableSentence).map(s => s.replace(/\s+/g, " ").trim());
}

function splitParagraph(para: string): string[] {
  const result: string[] = [];
  let buf = "";
  for (let i = 0; i < para.length; i++) {
    const c = para[i];
    buf += c;
    if (c === "." || c === "!" || c === "?") {
      let j = i + 1;
      while (j < para.length && /["'")\]]/.test(para[j])) {
        buf += para[j];
        j++;
      }
      const next = para.slice(j).trimStart();
      const lastWord = (buf.match(/(\S+)\.\s*$/) || [])[1]?.toLowerCase().replace(/[^a-z.]/g, "");
      const isAbbr = lastWord && ABBREVIATIONS.has(lastWord.replace(/\.$/, ""));
      const followsCapital = next.length === 0 || /^[A-Z"'(\[]/.test(next);
      if (!isAbbr && followsCapital) {
        result.push(buf.trim());
        buf = "";
        i = j - 1;
      }
    }
  }
  if (buf.trim()) result.push(buf.trim());
  return result.filter(s => s.length > 0);
}

// Heuristic: true if sentence has enough alphabetic content to be worth showing
function isReadableSentence(s: string): boolean {
  const t = s.trim();
  if (t.length < 2) return false;
  const letters = (t.match(/[a-zA-Z]/g) || []).length;
  // At least 60% alphabetic OR at least 8 letters
  if (letters < 4) return false;
  if (letters / t.length < 0.4 && letters < 12) return false;
  return true;
}

// Breath-unit split: break sentences longer than `maxWords` at natural clause
// boundaries (commas, semicolons, em-dashes, conjunctions) without abrupt cuts.
// Critically, never strand a tiny tail — merge it into the prior unit.
export interface BreathUnit {
  text: string;
  isFinal: boolean;
}

const MIN_TAIL_WORDS = 4;

export function splitIntoBreathUnits(sentence: string, maxWords = 16): BreathUnit[] {
  const trimmed = sentence.trim();
  const words = trimmed.split(/\s+/);
  if (words.length <= maxWords) return [{ text: trimmed, isFinal: true }];

  const units: BreathUnit[] = [];
  let current: string[] = [];

  const breakPoints = new Set([",", ";", ":", "—", "–"]);
  const conjunctions = new Set([
    "and", "but", "or", "yet", "so", "because", "although", "though",
    "while", "whereas", "since", "if", "when",
  ]);

  for (let i = 0; i < words.length; i++) {
    current.push(words[i]);
    const lastChar = words[i].slice(-1);
    const nextWord = words[i + 1]?.toLowerCase().replace(/[^a-z]/g, "");
    const atBreakPunct = breakPoints.has(lastChar);
    const minLen = Math.max(6, Math.floor(maxWords * 0.5));
    const atConjunction =
      nextWord && conjunctions.has(nextWord) && current.length >= minLen;
    const tooLong = current.length >= maxWords;
    const remaining = words.length - 1 - i;

    if ((atBreakPunct && current.length >= minLen) || atConjunction || tooLong) {
      // Don't break if the remaining tail would be tiny — keep going
      if (remaining > 0 && remaining < MIN_TAIL_WORDS && !tooLong) continue;

      if (tooLong && !atBreakPunct && !atConjunction) {
        // Walk back to nearest comma to avoid abrupt cuts
        let backIdx = current.length - 1;
        while (backIdx > minLen) {
          if (breakPoints.has(current[backIdx].slice(-1))) break;
          backIdx--;
        }
        if (backIdx > minLen) {
          const chunk = current.slice(0, backIdx + 1).join(" ");
          units.push({ text: chunk, isFinal: false });
          current = current.slice(backIdx + 1);
          continue;
        }
      }
      units.push({ text: current.join(" "), isFinal: false });
      current = [];
    }
  }
  if (current.length) {
    // If the trailing piece is too small, merge it back into the last unit
    if (units.length && current.length < MIN_TAIL_WORDS) {
      units[units.length - 1].text += " " + current.join(" ");
    } else {
      units.push({ text: current.join(" "), isFinal: false });
    }
  }
  if (units.length) units[units.length - 1].isFinal = true;
  return units;
}

export function estimateChunkMs(text: string, baseWpm: number, isFinal: boolean): number {
  const words = text.split(/\s+/).length;
  const syllableEst = text.split(/[aeiouy]+/i).length - 1;
  const complexity = Math.max(1, syllableEst / Math.max(1, words));
  const msPerWord = 60000 / baseWpm;
  let ms = words * msPerWord * Math.min(1.4, Math.max(0.85, complexity / 1.4));
  const last = text.slice(-1);
  if (isFinal) {
    if (last === "." || last === "!" || last === "?") ms += 320;
    else ms += 180;
  } else {
    if ([",", ";", ":", "—"].includes(last)) ms += 160;
    else ms += 90;
  }
  return Math.max(500, ms);
}
