// Strip headers, footers, page numbers, footnotes, URLs, and other noise
// from extracted text. For PDFs, we get per-page arrays — detect repeating
// top/bottom lines.

export function cleanPagesArray(pages: string[]): string {
  if (pages.length === 0) return "";
  if (pages.length === 1) return cleanSinglePage(pages[0]);

  const topCounts = new Map<string, number>();
  const bottomCounts = new Map<string, number>();
  const pageLines: string[][] = pages.map(p =>
    p.split("\n").map(l => l.trim()).filter(Boolean)
  );

  for (const lines of pageLines) {
    if (lines.length < 3) continue;
    const top = normalize(lines[0]);
    const bot = normalize(lines[lines.length - 1]);
    if (top) topCounts.set(top, (topCounts.get(top) || 0) + 1);
    if (bot) bottomCounts.set(bot, (bottomCounts.get(bot) || 0) + 1);
  }

  const threshold = Math.max(2, Math.floor(pages.length * 0.4));
  const repeatingTops = new Set(
    [...topCounts.entries()].filter(([, c]) => c >= threshold).map(([k]) => k)
  );
  const repeatingBots = new Set(
    [...bottomCounts.entries()].filter(([, c]) => c >= threshold).map(([k]) => k)
  );

  const cleanedPages = pageLines.map(lines => {
    const filtered = lines.filter((line, idx) => {
      const norm = normalize(line);
      if (idx === 0 && repeatingTops.has(norm)) return false;
      if (idx === lines.length - 1 && repeatingBots.has(norm)) return false;
      if (isJunkLine(line)) return false;
      return true;
    });
    return joinLines(filtered.map(scrubInline));
  });

  return cleanedPages.join("\n\n");
}

export function cleanSinglePage(text: string): string {
  const lines = text.split("\n").map(l => l.trim());
  const filtered = lines.filter(line => line.length > 0 && !isJunkLine(line));
  return joinLines(filtered.map(scrubInline));
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/\d+/g, "#").replace(/\s+/g, " ").trim();
}

// True if the entire line is noise (page number, copyright header, URL only, etc.)
function isJunkLine(line: string): boolean {
  const t = line.trim();
  if (!t) return false;
  // Page number patterns
  if (/^\d{1,4}$/.test(t)) return true;
  if (/^(page|pg\.?)\s*\d+(\s*(of|\/)\s*\d+)?$/i.test(t)) return true;
  if (/^[-–—•·]\s*\d+\s*[-–—•·]$/.test(t)) return true;
  // Lines that are only a URL / domain
  if (/^(https?:\/\/|www\.)\S+$/i.test(t)) return true;
  if (/^\S+\.(com|org|net|edu|gov|io|co)\/?\S*$/i.test(t)) return true;
  // Copyright / publisher boilerplate
  if (/^(copyright|©|all rights reserved|isbn|printed in|first published)/i.test(t)) return true;
  // Lines with very few letters and lots of digits/symbols (likely metadata)
  const letters = (t.match(/[a-zA-Z]/g) || []).length;
  if (letters < 3 && t.length > 0) return true;
  // Footnote-only lines like "[11] Some citation reference"
  if (/^\[\d+\]\s*$/.test(t)) return true;
  return false;
}

// Strip noise from inside a kept line: footnote markers, stray refs.
function scrubInline(line: string): string {
  return line
    // Footnote markers like [11], [123], [a], [iv]
    .replace(/\[(\d{1,4}|[a-z]|[ivxlcdm]+)\]/gi, "")
    // Superscript-style citation markers like ¹²³
    .replace(/[\u00B2\u00B3\u00B9\u2070-\u2079]+/g, "")
    // URLs embedded mid-line
    .replace(/\bhttps?:\/\/\S+/gi, "")
    .replace(/\bwww\.\S+/gi, "")
    // Multiple spaces left behind
    .replace(/\s{2,}/g, " ")
    .trim();
}

// Join lines smartly: blank lines separate paragraphs; soft-wrapped lines join.
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
      line.length < 60 &&
      !/[.!?,;:]$/.test(line) &&
      (line === line.toUpperCase() || /^[A-Z][A-Za-z\s]+$/.test(line));
    if (isHeading) { flush(); paragraphs.push(line); continue; }
    // Hyphenated word break: previous line ended with "-" → join tight
    if (buf.length && buf[buf.length - 1].endsWith("-")) {
      buf[buf.length - 1] = buf[buf.length - 1].slice(0, -1) + line;
    } else {
      buf.push(line);
    }
  }
  flush();
  return paragraphs.filter(Boolean).join("\n\n");
}
