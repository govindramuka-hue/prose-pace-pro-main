// Drives the ambient synth engine based on prefs + paused state.
// Synthesized in-browser — no network, no CORS, always works.
import { useEffect } from "react";
import { ambientEngine } from "@/lib/ambient-engine";
import type { Ambient } from "@/lib/reader-prefs";

interface Props {
  ambient: Ambient;
  volume: number;
  paused: boolean;
}

export function AmbientPlayer({ ambient, volume, paused }: Props) {
  // Switch ambient track
  useEffect(() => {
    ambientEngine.setAmbient(ambient);
  }, [ambient]);

  // Volume changes
  useEffect(() => {
    ambientEngine.setVolume(volume);
  }, [volume]);

  // Paused = fade master to 0; resume = fade back
  useEffect(() => {
    if (paused) {
      ambientEngine.suspend();
    } else {
      ambientEngine.resume().then(() => ambientEngine.unsuspend());
    }
  }, [paused]);

  return null;
}
