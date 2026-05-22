// Reader preferences (persisted to localStorage)
import { useEffect, useState } from "react";

export type Theme =
  | "midnight" | "dark" | "sepia" | "paper"
  | "light" | "dune" | "forest" | "contrast";
export type FontFamily =
  | "lora" | "literata" | "merriweather" | "crimson" | "libre" | "source-serif"
  | "spectral" | "vollkorn" | "garamond" | "cormorant" | "fraunces"
  | "inter" | "source-sans" | "atkinson" | "dyslexic";
export type Ambient =
  | "silence" | "rain" | "fireplace" | "forest"
  | "ocean" | "cafe" | "lofi" | "noise";
export type ReadingMode = "spotlight" | "flow";

export interface Prefs {
  theme: Theme;
  font: FontFamily;
  fontSize: number;        // px on focus block
  lineHeight: number;      // unitless
  width: number;           // px max-width of reading column
  wpm: number;
  highlight: boolean;
  ambient: Ambient;
  ambientVolume: number;   // 0..1
  showContext: boolean;     // show previous & next line previews
  contextOpacity: number;   // 0..1 opacity for those previews
  readingMode: ReadingMode;
  flowLines: number;
}

const KEY = "pt:prefs:v3";

const DEFAULTS: Prefs = {
  theme: "midnight",
  font: "lora",
  fontSize: 30,
  lineHeight: 1.35,
  width: 780,
  wpm: 320,
  highlight: true,
  ambient: "silence",
  ambientVolume: 0.4,
  showContext: true,
  contextOpacity: 0.55,
  readingMode: "spotlight",
  flowLines: 6,
};

function load(): Prefs {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch { return DEFAULTS; }
}

export function usePrefs(): [Prefs, (p: Partial<Prefs>) => void] {
  const [prefs, setPrefs] = useState<Prefs>(load);
  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(prefs));
    document.documentElement.setAttribute("data-theme", prefs.theme);
    document.documentElement.setAttribute("data-font", prefs.font);
  }, [prefs]);
  const update = (p: Partial<Prefs>) => setPrefs(prev => ({ ...prev, ...p }));
  return [prefs, update];
}

export const THEME_OPTIONS: { id: Theme; label: string; swatch: string }[] = [
  { id: "midnight", label: "Midnight", swatch: "#0c1730" },
  { id: "dark", label: "Cinema",   swatch: "#0d1014" },
  { id: "sepia", label: "Sepia",   swatch: "#e8d8b8" },
  { id: "paper", label: "Paper",   swatch: "#f4ede0" },
  { id: "light", label: "Light",   swatch: "#fcfcfc" },
  { id: "dune", label: "Dune",     swatch: "#d6a972" },
  { id: "forest", label: "Forest", swatch: "#1f2e22" },
  { id: "contrast", label: "Contrast", swatch: "#000000" },
];

export const FONT_OPTIONS: { id: FontFamily; label: string }[] = [
  { id: "lora", label: "Lora" },
  { id: "literata", label: "Literata" },
  { id: "merriweather", label: "Merriweather" },
  { id: "crimson", label: "Crimson" },
  { id: "libre", label: "Libre Baskerville" },
  { id: "source-serif", label: "Source Serif" },
  { id: "spectral", label: "Spectral" },
  { id: "vollkorn", label: "Vollkorn" },
  { id: "garamond", label: "EB Garamond" },
  { id: "cormorant", label: "Cormorant" },
  { id: "fraunces", label: "Fraunces" },
  { id: "inter", label: "Inter" },
  { id: "source-sans", label: "Source Sans" },
  { id: "atkinson", label: "Atkinson" },
  { id: "dyslexic", label: "OpenDyslexic" },
];

export const FONT_STACKS: Record<FontFamily, string> = {
  lora: "'Lora', Georgia, serif",
  literata: "'Literata', Georgia, serif",
  merriweather: "'Merriweather', Georgia, serif",
  crimson: "'Crimson Text', Georgia, serif",
  libre: "'Libre Baskerville', Georgia, serif",
  "source-serif": "'Source Serif 4', Georgia, serif",
  spectral: "'Spectral', Georgia, serif",
  vollkorn: "'Vollkorn', Georgia, serif",
  garamond: "'EB Garamond', Georgia, serif",
  cormorant: "'Cormorant Garamond', Georgia, serif",
  fraunces: "'Fraunces', Georgia, serif",
  inter: "'Inter', system-ui, sans-serif",
  "source-sans": "'Source Sans 3', system-ui, sans-serif",
  atkinson: "'Atkinson Hyperlegible', system-ui, sans-serif",
  dyslexic: "'OpenDyslexic', 'Atkinson Hyperlegible', 'Inter', sans-serif",
};

// Ambient soundscapes — synthesized in-browser via Web Audio API.
// No network dependency, no CORS issues, always works.
export const AMBIENT_OPTIONS: { id: Ambient; label: string }[] = [
  { id: "silence", label: "Silence" },
  { id: "rain", label: "Rain" },
  { id: "fireplace", label: "Fireplace" },
  { id: "forest", label: "Forest" },
  { id: "ocean", label: "Ocean" },
  { id: "cafe", label: "Café" },
  { id: "lofi", label: "Lo-fi" },
  { id: "noise", label: "White noise" },
];
