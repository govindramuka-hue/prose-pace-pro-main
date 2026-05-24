import { motion } from "framer-motion";
import type { Block } from "@/lib/smart-chunker";
import { MathText } from "@/components/MathText";

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
        <MathText text={fullText} highlight={highlight} highlightProgress={highlightProgress} onWordTap={onWordTap} />
      </p>
    </motion.div>
  );
}

function formatBlock(block: Block) {
  if (block.type === "dialogue") return `“${block.text.replace(/^[\u201C"]|[\u201D"]$/g, "")}”`;
  return block.text;
}
