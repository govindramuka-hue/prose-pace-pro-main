interface Props {
  scores: number[];
  currentIdx: number;
  peaks?: number[];
  onScrub?: (idx: number) => void;
}

export function TensionBar({ scores, currentIdx, onScrub }: Props) {
  if (scores.length === 0) return null;
  const progressPct = Math.max(0, Math.min(100, (currentIdx / Math.max(1, scores.length - 1)) * 100));

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!onScrub) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    onScrub(Math.round(ratio * (scores.length - 1)));
  }

  return (
    <div
      className="relative h-2.5 w-full cursor-pointer overflow-hidden rounded-full bg-muted/60"
      onClick={handleClick}
      aria-label="Reading progress"
      role={onScrub ? "slider" : "progressbar"}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progressPct)}
    >
      <div
        className="h-full rounded-full tension-gradient transition-[width] duration-300"
        style={{ width: `${progressPct}%` }}
      />
    </div>
  );
}
