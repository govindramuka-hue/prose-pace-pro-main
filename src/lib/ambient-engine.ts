// Ambient audio synthesis using Web Audio API.
// Zero network dependency — works offline, no CORS, no broken CDNs.
// Each ambient is a procedurally shaped noise + optional oscillators.

import type { Ambient } from "./reader-prefs";

class AmbientEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private nodes: AudioNode[] = [];
  private current: Ambient = "silence";
  private targetVolume = 0.4;

  private ensureCtx() {
    if (!this.ctx) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const Ctor = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0;
      this.master.connect(this.ctx.destination);
    }
    return this.ctx;
  }

  private stopAll() {
    for (const n of this.nodes) {
      try { (n as AudioScheduledSourceNode).stop?.(); } catch { /* noop */ }
      try { n.disconnect(); } catch { /* noop */ }
    }
    this.nodes = [];
  }

  // Generate a buffer of pink/brown noise — much warmer than white noise.
  private noiseBuffer(seconds: number, type: "white" | "pink" | "brown") {
    const ctx = this.ensureCtx();
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    if (type === "white") {
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    } else if (type === "pink") {
      // Paul Kellett's pink noise approximation
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < len; i++) {
        const w = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + w * 0.0555179;
        b1 = 0.99332 * b1 + w * 0.0750759;
        b2 = 0.96900 * b2 + w * 0.1538520;
        b3 = 0.86650 * b3 + w * 0.3104856;
        b4 = 0.55000 * b4 + w * 0.5329522;
        b5 = -0.7616 * b5 - w * 0.0168980;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
        b6 = w * 0.115926;
      }
    } else {
      // Brown noise — integrated white noise
      let last = 0;
      for (let i = 0; i < len; i++) {
        const w = Math.random() * 2 - 1;
        last = (last + 0.02 * w) / 1.02;
        data[i] = last * 3.5;
      }
    }
    return buf;
  }

  private buildRain() {
    const ctx = this.ensureCtx();
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer(6, "pink");
    src.loop = true;
    const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 600;
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 4500;
    const g = ctx.createGain(); g.gain.value = 1.4;
    src.connect(hp); hp.connect(lp); lp.connect(g); g.connect(this.master!);
    src.start();
    this.nodes.push(src, hp, lp, g);
  }

  private buildFireplace() {
    const ctx = this.ensureCtx();
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer(8, "brown");
    src.loop = true;
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 800;
    const g = ctx.createGain(); g.gain.value = 1.6;
    // Crackle: random gain bumps via LFO-like modulation
    const crackleSrc = ctx.createBufferSource();
    crackleSrc.buffer = this.noiseBuffer(3, "white");
    crackleSrc.loop = true;
    const crackleHP = ctx.createBiquadFilter(); crackleHP.type = "highpass"; crackleHP.frequency.value = 2500;
    const crackleG = ctx.createGain(); crackleG.gain.value = 0.04;
    crackleSrc.connect(crackleHP); crackleHP.connect(crackleG); crackleG.connect(this.master!);
    src.connect(lp); lp.connect(g); g.connect(this.master!);
    src.start(); crackleSrc.start();
    this.nodes.push(src, lp, g, crackleSrc, crackleHP, crackleG);
  }

  private buildForest() {
    const ctx = this.ensureCtx();
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer(10, "pink");
    src.loop = true;
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 2200;
    const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 200;
    const g = ctx.createGain(); g.gain.value = 0.9;
    src.connect(hp); hp.connect(lp); lp.connect(g); g.connect(this.master!);
    src.start();
    this.nodes.push(src, hp, lp, g);
  }

  private buildOcean() {
    const ctx = this.ensureCtx();
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer(8, "brown");
    src.loop = true;
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 1200;
    const g = ctx.createGain();
    // Slow LFO swell to mimic waves
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.12;
    const lfoGain = ctx.createGain(); lfoGain.gain.value = 0.5;
    lfo.connect(lfoGain); lfoGain.connect(g.gain);
    g.gain.value = 0.9;
    src.connect(lp); lp.connect(g); g.connect(this.master!);
    src.start(); lfo.start();
    this.nodes.push(src, lp, g, lfo, lfoGain);
  }

  private buildCafe() {
    const ctx = this.ensureCtx();
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer(8, "pink");
    src.loop = true;
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 1800;
    const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 300;
    const g = ctx.createGain(); g.gain.value = 1.0;
    src.connect(hp); hp.connect(lp); lp.connect(g); g.connect(this.master!);
    src.start();
    this.nodes.push(src, hp, lp, g);
  }

  private buildLofi() {
    const ctx = this.ensureCtx();
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer(6, "brown");
    src.loop = true;
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 600;
    const g = ctx.createGain(); g.gain.value = 0.7;
    src.connect(lp); lp.connect(g); g.connect(this.master!);
    src.start();
    this.nodes.push(src, lp, g);
  }

  private buildWhiteNoise() {
    const ctx = this.ensureCtx();
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer(4, "white");
    src.loop = true;
    const g = ctx.createGain(); g.gain.value = 0.3;
    src.connect(g); g.connect(this.master!);
    src.start();
    this.nodes.push(src, g);
  }

  setAmbient(ambient: Ambient) {
    if (ambient === this.current) return;
    this.stopAll();
    this.current = ambient;
    if (ambient === "silence") return;
    this.ensureCtx();
    switch (ambient) {
      case "rain": this.buildRain(); break;
      case "fireplace": this.buildFireplace(); break;
      case "forest": this.buildForest(); break;
      case "ocean": this.buildOcean(); break;
      case "cafe": this.buildCafe(); break;
      case "lofi": this.buildLofi(); break;
      case "noise": this.buildWhiteNoise(); break;
    }
  }

  setVolume(v: number) {
    this.targetVolume = v;
    if (this.master && this.ctx) {
      this.master.gain.cancelScheduledValues(this.ctx.currentTime);
      this.master.gain.linearRampToValueAtTime(v, this.ctx.currentTime + 0.25);
    }
  }

  async resume() {
    const ctx = this.ensureCtx();
    if (ctx.state === "suspended") await ctx.resume();
  }

  suspend() {
    if (this.master && this.ctx) {
      this.master.gain.cancelScheduledValues(this.ctx.currentTime);
      this.master.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.2);
    }
  }

  unsuspend() {
    if (this.master && this.ctx) {
      this.master.gain.cancelScheduledValues(this.ctx.currentTime);
      this.master.gain.linearRampToValueAtTime(this.targetVolume, this.ctx.currentTime + 0.25);
    }
  }
}

export const ambientEngine = new AmbientEngine();
