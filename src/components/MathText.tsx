import katex from "katex";

interface Props {
  text: string;
  highlightProgress?: number;
  highlight?: boolean;
  onWordTap?: (word: string) => void;
}

export function MathText({ text, highlightProgress = 0, highlight = false, onWordTap }: Props) {
  const parts = splitMath(normalizeMathText(text));
  const wordTotal = parts.reduce((sum, part) => sum + (part.math ? 0 : part.text.split(/\s+/).filter(Boolean).length), 0);
  const litCount = highlight ? Math.round(highlightProgress * wordTotal) : -1;
  let wordOrder = -1;

  return (
    <>
      {parts.map((part, i) => {
        if (part.math) {
          return <span key={i} className="mx-1 inline-block align-baseline" dangerouslySetInnerHTML={{ __html: renderMath(part.text) }} />;
        }
        return part.text.split(/(\s+)/).map((tok, j) => {
          if (!/\S/.test(tok)) return tok;
          wordOrder += 1;
          const lit = highlight && wordOrder < litCount;
          return (
            <span
              key={`${i}-${j}`}
              onClick={(e) => {
                e.stopPropagation();
                onWordTap?.(tok.replace(/[^\p{L}'-]/gu, ""));
              }}
              style={{
                color: lit ? "hsl(var(--reading-highlight))" : undefined,
                transition: "color 220ms ease",
                cursor: onWordTap ? "pointer" : "default",
              }}
            >
              {tok}
            </span>
          );
        });
      })}
    </>
  );
}

function splitMath(text: string) {
  const out: { text: string; math: boolean }[] = [];
  const re = /(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$|\\\([\s\S]+?\\\)|\\\[[\s\S]+?\\\]|(?:\\(?:frac|sum|int|sqrt|alpha|beta|gamma|Delta|theta|lambda|mu|pi|sigma|infty|leq|geq|neq|approx|cdot|times)[^\s,;]*)+)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) {
    if (match.index > last) out.push({ text: text.slice(last, match.index), math: false });
    out.push({ text: unwrapMath(match[0]), math: true });
    last = re.lastIndex;
  }
  if (last < text.length) out.push({ text: text.slice(last), math: false });
  return out;
}

function unwrapMath(value: string) {
  if (value.startsWith("$$")) return value.slice(2, -2);
  if (value.startsWith("$")) return value.slice(1, -1);
  if (value.startsWith("\\(") || value.startsWith("\\[")) return value.slice(2, -2);
  return value;
}

function renderMath(value: string) {
  try {
    return katex.renderToString(value, { throwOnError: false, strict: false });
  } catch {
    return value;
  }
}

function normalizeMathText(text: string) {
  return text
    .replace(/\b([A-Za-z0-9]+)\s*\^\s*([A-Za-z0-9]+)\b/g, "$$$1^{$2}$$")
    .replace(/\b([A-Za-z0-9]+)\s*_\s*([A-Za-z0-9]+)\b/g, "$$$1_{$2}$$")
    .replace(/([∑∫√∞≤≥≠≈])/g, " $1 ");
}
