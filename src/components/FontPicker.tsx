import { useEffect, useState } from "react";
import { Check, Type } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FONT_OPTIONS, FONT_STACKS, type FontFamily } from "@/lib/reader-prefs";

interface Props {
  value: FontFamily;
  onChange: (font: FontFamily) => void;
}

const PREVIEW_LINE = "The page changes its voice without losing the story.";

export function FontPicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const current = FONT_OPTIONS.find(font => font.id === value) ?? FONT_OPTIONS[0];
  const preview = FONT_OPTIONS.find(font => font.id === draft) ?? current;

  useEffect(() => {
    if (open) setDraft(value);
  }, [open, value]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full min-h-16 rounded-xl border border-border bg-secondary/70 px-4 py-3 text-left hover:border-primary/50 transition-colors"
      >
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-1">Current font</div>
            <div className="truncate text-xl leading-tight" style={{ fontFamily: FONT_STACKS[current.id] }}>
              {current.label}
            </div>
          </div>
          <span className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-border bg-card">
            <Type className="h-4 w-4 text-primary" />
          </span>
        </div>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[88vh] overflow-hidden bg-card border-border p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
            <DialogTitle className="font-display text-2xl">Choose reading font</DialogTitle>
          </DialogHeader>
          <div className="reading-surface px-6 py-7 border-b border-border">
            <div className="text-[10px] uppercase tracking-[0.28em] mb-4" style={{ color: "hsl(var(--reading-dim))" }}>
              Preview
            </div>
            <p
              className="text-2xl md:text-3xl leading-snug text-balance"
              style={{ color: "hsl(var(--reading-text))", fontFamily: FONT_STACKS[preview.id] }}
            >
              {PREVIEW_LINE}
            </p>
          </div>
          <div className="max-h-[52vh] overflow-y-auto scrollbar-hide p-4">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {FONT_OPTIONS.map(font => {
                const selected = draft === font.id;
                return (
                  <button
                    key={font.id}
                    type="button"
                    onClick={() => setDraft(font.id)}
                    className={`min-h-20 rounded-xl border px-4 py-3 text-left transition-all ${
                      selected
                        ? "border-primary bg-primary/10 ring-2 ring-primary/20"
                        : "border-border bg-secondary/60 hover:border-primary/45 hover:bg-secondary"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-lg leading-tight" style={{ fontFamily: FONT_STACKS[font.id] }}>
                          {font.label}
                        </div>
                        <div
                          className="mt-2 truncate text-sm text-muted-foreground"
                          style={{ fontFamily: FONT_STACKS[font.id] }}
                        >
                          {sampleFor(font.id)}
                        </div>
                      </div>
                      {selected && <Check className="h-4 w-4 flex-shrink-0 text-primary" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-3">
            <button type="button" onClick={() => setOpen(false)} className="h-10 rounded-full border border-border px-4 text-sm hover:bg-muted">
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                onChange(draft);
                setOpen(false);
              }}
              className="h-10 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              Apply font
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function sampleFor(font: FontFamily) {
  if (font === "inter" || font === "source-sans" || font === "atkinson" || font === "dyslexic") {
    return "Clean and readable";
  }
  if (font === "fraunces" || font === "cormorant" || font === "garamond") {
    return "Elegant literary tone";
  }
  return "Classic reading rhythm";
}
