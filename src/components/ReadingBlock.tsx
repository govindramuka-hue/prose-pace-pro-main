// Single focus block — per-word highlight that flows word-by-word across lines
// (no horizontal full-line sweep). Words are tappable for dictionary lookup.
import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import type { Block } from "@/lib/smart-chunker";

interface Props {
  block: Block;
  blockKey: string | number;
  progress: number;      // 0..1 sweep progress
  highlight: boolean;
  fontSize: number;
  lineHeight: number;
  onWordTap?: (w: string) => void;
}

export function ReadingBlock({ block, blockKey, progress, highlight, fontSize, lineHeight, onWordTap }: Props) {
  const isDialogue = block.type === "dialogue";
  const isQuote = block.type === "quote";

  // Responsive font scaling — keep the user's pref but down-scale on small viewports
  // so mobile doesn't get the desktop-sized 30px+ block.
  const [vw, setVw] = useState<number>(() =>
    typeof window !== "undefined" ? window.innerWidth : 1024
  );
  useEffect(() => {
    const onResize = () => setVw(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  const scale = vw < 380 ? 0.62 : vw < 480 ? 0.7 : vw < 640 ? 0.78 : vw < 768 ? 0.88 : 1;
  const effFontSize = Math.round(fontSize * scale);
  const effLineHeight = vw < 640 ? Math.max(1.3, lineHeight - 0.05) : lineHeight;

  const display = useMemo(() => {
    if (isDialogue) {
      const inner = block.text.replace(/^[\u201C"]|[\u201D"]$/g, "");
      return `\u201C${inner}\u201D`;
    }
    return block.text;
  }, [block.text, isDialogue]);

  const tokens = useMemo(() => display.split(/(\s+)/), [display]);
  const wordIndices = useMemo(() => tokens.map((t, i) => (/\S/.test(t) ? i : -1)).filter(i => i >= 0), [tokens]);
  const litCount = highlight ? Math.round(progress * wordIndices.length) : -1;

  return (
    <motion.div
      key={blockKey}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="w-full text-center"
    >
      {isDialogue && (
        <div className="text-[10px] uppercase tracking-[0.25em] mb-3" style={{ color: "hsl(var(--reading-dim))" }}>
          dialogue
        </div>
      )}
      {isQuote && (
        <div className="mx-auto mb-4 h-px w-12" style={{ background: "hsl(var(--reading-dim) / 0.5)" }} />
      )}

      <p
        className={`font-display ${isQuote ? "italic" : ""} ${isDialogue ? "font-medium" : ""} text-balance`}
        style={{
          fontSize: `${effFontSize}px`,
          lineHeight: effLineHeight,
          color: "hsl(var(--reading-text))",
          letterSpacing: isQuote ? "0.01em" : "0",
        }}
      >
        {tokens.map((tok, i) => {
          if (!/\S/.test(tok)) return tok;
          const wordOrder = wordIndices.indexOf(i);
          const lit = highlight && wordOrder < litCount;
          return (
            <span
              key={i}
              onClick={(e) => {
                e.stopPropagation();
                if (onWordTap) onWordTap(tok.replace(/[^\p{L}'-]/gu, ""));
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
        })}
      </p>
    </motion.div>
  );
}
