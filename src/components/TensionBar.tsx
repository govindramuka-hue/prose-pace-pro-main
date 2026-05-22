interface Props {
  scores: number[];
  currentIdx: number;
  peaks: number[];
  onScrub?: (idx: number) => void;
}

export function TensionBar({ scores, currentIdx, peaks, onScrub }: Props) {
  if (scores.length === 0) return null;
  const w = 100;
  const h = 28;
  const stepX = w / Math.max(1, scores.length - 1);
  const points = scores.map((s, i) => `${i * stepX},${h - (s / 10) * h}`).join(" ");
  const areaPath = `M0,${h} L${points} L${w},${h} Z`;
  const progressPct = (currentIdx / Math.max(1, scores.length - 1)) * 100;

  function handleClick(e: React.MouseEvent<SVGSVGElement>) {
    if (!onScrub) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    onScrub(Math.round(ratio * (scores.length - 1)));
  }

  return (
    <div className="relative w-full">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
        className="w-full h-7 cursor-pointer"
        onClick={handleClick}
      >
        <defs>
          <linearGradient id="tensionGrad" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="hsl(var(--tension-low))" />
            <stop offset="50%" stopColor="hsl(var(--tension-mid))" />
            <stop offset="100%" stopColor="hsl(var(--tension-high))" />
          </linearGradient>
          <clipPath id="progressClip">
            <rect x="0" y="0" width={(progressPct / 100) * w} height={h} />
          </clipPath>
        </defs>
        {/* Dim full curve */}
        <path d={areaPath} fill="hsl(var(--muted))" opacity="0.35" />
        {/* Lit progress */}
        <g clipPath="url(#progressClip)">
          <path d={areaPath} fill="url(#tensionGrad)" opacity="0.9" />
        </g>
        {/* Peak markers */}
        {peaks.map(p => (
          <circle
            key={p}
            cx={p * stepX}
            cy={h - (scores[p] / 10) * h}
            r="0.8"
            fill="hsl(var(--reading-highlight))"
          />
        ))}
        {/* Playhead */}
        <line
          x1={(progressPct / 100) * w}
          x2={(progressPct / 100) * w}
          y1="0"
          y2={h}
          stroke="hsl(var(--reading-text))"
          strokeWidth="0.4"
        />
      </svg>
    </div>
  );
}
