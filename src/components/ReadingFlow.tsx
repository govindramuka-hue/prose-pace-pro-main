import { motion } from "framer-motion";
import type { Block } from "@/lib/smart-chunker";

interface Props {
  blocks: Block[];
  blockKey: string | number;
  highlightProgress?: number;
  highlight?: boolean;
  fontSize: number;
  lineHeight: number;
  onWordTap?: (word: string) => void;
}

export function ReadingFlow({ blocks, blockKey, highlightProgress = 0, highlight = true, fontSize, lineHeight, onWordTap }: Props) {
  const fullText = blocks.map(formatBlock).join(" ");
  const words = fullText.split(/(\s+)/);
  const wordCount = words.filter(tok => /\S/.test(tok)).length;
  const litCount = highlight ? Math.round(highlightProgress * wordCount) : -1;
  let wordOrder = -1;

  return (
    <motion.div
      key={blockKey}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
      className="w-full text-left"
    >
      <p
        className="reading-copy text-balance"
        style={{
          fontSize: `clamp(20px, ${Math.max(22, fontSize - 4)}px, 34px)`,
          lineHeight: Math.max(1.35, lineHeight + 0.08),
          color: "hsl(var(--reading-text))",
        }}
      >
        {words.map((tok, i) => {
          if (!/\S/.test(tok)) return tok;
          wordOrder += 1;
          const lit = highlight && wordOrder < litCount;
          return (
            <span
              key={i}
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
        })}
      </p>
    </motion.div>
  );
}

function formatBlock(block: Block) {
  if (block.type === "dialogue") return `“${block.text.replace(/^[\u201C"]|[\u201D"]$/g, "")}”`;
  return block.text;
}
