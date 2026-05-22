import { Rows3, ScanLine } from "lucide-react";
import type { Prefs, ReadingMode } from "@/lib/reader-prefs";

interface Props {
  prefs: Prefs;
  setPrefs: (p: Partial<Prefs>) => void;
}

export function ReadingModeControl({ prefs, setPrefs }: Props) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <ModeButton
          active={prefs.readingMode === "spotlight"}
          icon={<ScanLine className="h-4 w-4" />}
          title="Spotlight"
          detail="One focused line"
          onClick={() => setPrefs({ readingMode: "spotlight" })}
        />
        <ModeButton
          active={prefs.readingMode === "flow"}
          icon={<Rows3 className="h-4 w-4" />}
          title="Flow"
          detail="Several lines"
          onClick={() => setPrefs({ readingMode: "flow" })}
        />
      </div>
      {prefs.readingMode === "flow" && (
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
            Lines per screen {prefs.flowLines}
          </div>
          <input
            type="range"
            min={3}
            max={10}
            step={1}
            value={prefs.flowLines}
            onChange={e => setPrefs({ flowLines: +e.target.value })}
            className="w-full accent-primary"
          />
        </div>
      )}
    </div>
  );
}

function ModeButton({
  active,
  icon,
  title,
  detail,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  title: string;
  detail: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-16 rounded-xl border px-3 py-3 text-left transition-all ${
        active
          ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/20"
          : "border-border bg-secondary/70 text-secondary-foreground hover:border-primary/45"
      }`}
    >
      <div className="flex items-center gap-2 text-sm font-medium">
        {icon}
        {title}
      </div>
      <div className="mt-1 text-[11px] text-muted-foreground">{detail}</div>
    </button>
  );
}
