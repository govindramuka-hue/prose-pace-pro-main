interface BookCoverProps {
  title: string;
  hue: number;
  className?: string;
}

export function BookCover({ title, hue, className = "" }: BookCoverProps) {
  const h2 = (hue + 35) % 360;
  return (
    <div
      className={`relative overflow-hidden rounded-lg ${className}`}
      style={{
        background: `linear-gradient(135deg, hsl(${hue} 65% 22%), hsl(${h2} 60% 12%))`,
      }}
    >
      <div className="absolute inset-0 opacity-30 mix-blend-overlay" style={{
        background: `radial-gradient(circle at 30% 20%, hsl(${hue} 90% 70% / 0.6), transparent 60%)`,
      }} />
      <div className="absolute inset-0 flex items-end p-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.25em] text-white/60 mb-1">PageTurner</div>
          <div className="font-display text-lg font-semibold text-white leading-tight line-clamp-3">{title}</div>
        </div>
      </div>
    </div>
  );
}
