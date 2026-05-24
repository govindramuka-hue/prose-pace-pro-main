// Clean extracted text before it reaches the reader.
// The goal is to keep readable prose while stripping page furniture, tables,
// figure captions, license boilerplate, and common OCR debris.

export function cleanPagesArray(pages: string[]): string {
  if (pages.length === 0) return "";
  if (pages.length === 1) return cleanSinglePage(pages[0]);

  const topCounts = new Map<string, number>();
  const bottomCounts = new Map<string, number>();
  const pageLines = pages.map(p => p.split("\n").map(l => l.trim()).filter(Boolean));

  for (const lines of pageLines) {
    if (lines.length < 3) continue;
    const top = normalize(lines[0]);
    const bot = normalize(lines[lines.length - 1]);
    if (top) topCounts.set(top, (topCounts.get(top) || 0) + 1);
    if (bot) bottomCounts.set(bot, (bottomCounts.get(bot) || 0) + 1);
  }

  const threshold = Math.max(2, Math.floor(pages.length * 0.4));
  const repeatingTops = new Set([...topCounts.entries()].filter(([, c]) => c >= threshold).map(([k]) => k));
  const repeatingBots = new Set([...bottomCounts.entries()].filter(([, c]) => c >= threshold).map(([k]) => k));

  return pageLines.map(lines => {
    const filtered = lines.filter((line, idx) => {
      const norm = normalize(line);
      if (idx === 0 && repeatingTops.has(norm)) return false;
      if (idx === lines.length - 1 && repeatingBots.has(norm)) return false;
      return keepLine(line);
    });
    return joinLines(filtered.map(scrubInline));
  }).filter(Boolean).join("\n\n");
}

export function cleanSinglePage(text: string): string {
  return joinLines(
    text
      .split("\n")
      .map(line => line.trim())
      .filter(keepLine)
      .map(scrubInline)
  );
}

function keepLine(line: string) {
  const t = line.trim();
  if (!t) return false;
  if (isJunkLine(t)) return false;
  if (isLikelyTableLine(t)) return false;
  return true;
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/\d+/g, "#").replace(/\s+/g, " ").trim();
}

function isJunkLine(line: string): boolean {
  const t = line.trim();
  if (/^\d{1,4}$/.test(t)) return true;
  if (/^(page|pg\.?)\s*\d+(\s*(of|\/)\s*\d+)?$/i.test(t)) return true;
  if (/^[-–—•·]\s*\d+\s*[-–—•·]$/.test(t)) return true;
  if (/^(https?:\/\/|www\.)\S+$/i.test(t)) return true;
  if (/^\S+\.(com|org|net|edu|gov|io|co)\/?\S*$/i.test(t)) return true;
  if (/^(copyright|©|all rights reserved|isbn|printed in|first published|licensed under|creative commons|project gutenberg|transcriber's note|table of contents)/i.test(t)) return true;
  if (/\b(project gutenberg|all rights reserved|creative commons|licensed under|isbn|doi:|downloaded from)\b/i.test(t)) return true;
  if (/^(figure|fig\.|table)\s+\d+[:.\s]/i.test(t)) return true;
  if (/^\[\d+\]\s*$/.test(t)) return true;

  const letters = (t.match(/[a-zA-Z]/g) || []).length;
  if (letters < 3 && t.length > 0) return true;
  return false;
}

function isLikelyTableLine(line: string): boolean {
  const t = line.trim();
  if (t.length < 10) return false;
  const multiSpaceColumns = t.split(/\s{2,}/).filter(Boolean);
  const pipeColumns = t.split("|").filter(Boolean);
  const tabColumns = t.split("\t").filter(Boolean);
  if (multiSpaceColumns.length >= 3 || pipeColumns.length >= 3 || tabColumns.length >= 3) return true;

  const numericTokens = (t.match(/\b\d+(\.\d+)?%?\b/g) || []).length;
  const wordTokens = (t.match(/[A-Za-z]{2,}/g) || []).length;
  if (numericTokens >= 4 && wordTokens <= 8) return true;
  if (/^[-+\s|:]+$/.test(t)) return true;
  return false;
}

function scrubInline(line: string): string {
  return line
    .replace(/\[(\d{1,4}|[a-z]|[ivxlcdm]+)\]/gi, "")
    .replace(/[\u00B2\u00B3\u00B9\u2070-\u2079]+/g, "")
    .replace(/\bhttps?:\/\/\S+/gi, "")
    .replace(/\bwww\.\S+/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function joinLines(lines: string[]): string {
  const paragraphs: string[] = [];
  let buf: string[] = [];
  const flush = () => {
    if (buf.length) {
      paragraphs.push(buf.join(" ").replace(/\s+/g, " ").trim());
      buf = [];
    }
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { flush(); continue; }
    const isHeading =
      line.length < 90 &&
      !/[.!?,;:]$/.test(line) &&
      (line === line.toUpperCase() || /^(chapter|part|section|abstract|introduction|conclusion|references|appendix|method|methods|results|discussion)\b/i.test(line));
    if (isHeading) { flush(); paragraphs.push(line); continue; }
    if (buf.length && buf[buf.length - 1].endsWith("-")) {
      buf[buf.length - 1] = buf[buf.length - 1].slice(0, -1) + line;
    } else {
      buf.push(line);
    }
  }
  flush();
  return paragraphs.filter(Boolean).join("\n\n");
}
