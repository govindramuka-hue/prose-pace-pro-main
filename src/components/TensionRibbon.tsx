// Cinematic tension ribbon at the bottom of the reader.
// Shows AI-rated scene scores, the current scene's label, and fades up at peaks.
import { motion } from "framer-motion";
import type { Chapter } from "@/data/book";

interface Props {
  chapter: Chapter;
  currentSceneIdx: number;
  blockProgress: number;   // 0..1 within current chapter
  onJumpScene: (i: number) => void;
}

export function TensionRibbon({ chapter, currentSceneIdx, blockProgress, onJumpScene }: Props) {
  const scene = chapter.scenes[currentSceneIdx];
  const isPeak = scene && scene.score >= 8;

  return (
    <div className="w-full">
      {/* Scene label + moment */}
      <div className="flex items-center justify-between gap-3 mb-2 min-h-[18px]">
        <div className="flex items-center gap-2 text-[11px]">
          <span
            className="inline-block w-1.5 h-1.5 rounded-full"
            style={{ background: scoreColor(scene?.score ?? 5) }}
          />
          <span className="uppercase tracking-[0.18em]" style={{ color: "hsl(var(--reading-dim))" }}>
            {scene?.label ?? ""}
          </span>
          {isPeak && (
            <motion.span
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              className="text-[10px] uppercase tracking-[0.2em] text-primary px-1.5 py-0.5 rounded-full bg-primary/10 border border-primary/30"
            >
              peak
            </motion.span>
          )}
        </div>
        <span className="text-[10px] tabular-nums" style={{ color: "hsl(var(--reading-dim))" }}>
          {Math.round(blockProgress * 100)}%
        </span>
      </div>

      {/* Ribbon: each scene as a colored bar segment, with playhead */}
      <div className="relative h-2 flex items-stretch gap-0.5">
        {chapter.scenes.map((s, i) => (
          <button
            key={i}
            onClick={() => onJumpScene(i)}
            className="flex-1 rounded-sm transition-all"
            title={`${s.label} (${s.score.toFixed(1)})`}
            style={{
              background: scoreColor(s.score),
              opacity: i === currentSceneIdx ? 1 : 0.45,
              transform: i === currentSceneIdx ? "scaleY(1.5)" : "scaleY(1)",
              transformOrigin: "bottom",
            }}
          />
        ))}
      </div>

      {/* Cinematic moment text — only shown at peaks */}
      {isPeak && scene?.moment && (
        <motion.div
          key={`m-${currentSceneIdx}`}
          initial={{ opacity: 0 }} animate={{ opacity: 0.7 }}
          className="mt-2 text-center text-[11px] italic"
          style={{ color: "hsl(var(--reading-dim))" }}
        >
          {scene.moment}
        </motion.div>
      )}
    </div>
  );
}

function scoreColor(score: number): string {
  // 0..10 → blue → amber → red
  if (score < 4) return "hsl(var(--tension-low))";
  if (score < 7) return "hsl(var(--tension-mid))";
  return "hsl(var(--tension-high))";
}
