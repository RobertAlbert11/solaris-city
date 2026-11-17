// Authored by Solaris City agent (gta6-01)
// audio.js — WebAudio synthesized sounds: engine hum, gunshots, sirens, pickups. No external files.
export class Audio {
  constructor(game) {
    this.game = game;
    this.ctx = null;
    this.enabled = false;
    this.engineOsc = null;
    this.engineGain = null;
    this.lastGun = 0;
    this.lastSiren = 0;
  }

  start() {
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      // browsers start contexts suspended until a user gesture — resume if needed
      if (this.ctx.state === 'suspended') this.ctx.resume();
      this.enabled = true;
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.35;
      this.master.connect(this.ctx.destination);
      // engine: low sawtooth with a lowpass, gain modulated by speed
      this.engineOsc = this.ctx.createOscillator();
      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.value = 40;
      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 220;
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.value = 0;
      this.engineOsc.connect(lp); lp.connect(this.engineGain); this.engineGain.connect(this.master);
      this.engineOsc.start();
    } catch (e) { this.enabled = false; }
  }

  blip(freq = 660, dur = 0.1, type = 'square', vol = 0.15) {
    if (!this.enabled) return;
    try {
      const o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.type = type; o.frequency.value = freq;
      g.gain.setValueAtTime(vol, this.ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
      o.connect(g); g.connect(this.master);
      o.start(); o.stop(this.ctx.currentTime + dur);
    } catch (e) { /* ignore */ }
  }

  noiseBurst(dur = 0.12, vol = 0.25, filterFreq = 1200) {
    if (!this.enabled) return;
    try {
      const n = Math.floor(this.ctx.sampleRate * dur);
      const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const f = this.ctx.createBiquadFilter();
      f.type = 'lowpass'; f.frequency.value = filterFreq;
      const g = this.ctx.createGain();
      g.gain.value = vol;
      src.connect(f); f.connect(g); g.connect(this.master);
      src.start();
    } catch (e) { /* ignore */ }
  }

  gunshot() { const now = performance.now(); if (now - this.lastGun < 90) return; this.lastGun = now; this.noiseBurst(0.1, 0.3, 2400); this.blip(140, 0.06, 'sawtooth', 0.2); }

  siren(wail = true) {
    if (!this.enabled) return;
    const now = performance.now();
    if (now - this.lastSiren < (wail ? 700 : 250)) return;
    this.lastSiren = now;
    this.blip(wail ? 720 : 900, wail ? 0.5 : 0.16, 'sine', 0.08);
    if (wail) this.blip(540, 0.5, 'sine', 0.06);
  }

  cash() { this.blip(880, 0.08, 'square', 0.12); setTimeout(() => this.blip(1320, 0.12, 'square', 0.12), 90); }

  crash(intensity = 1) { this.noiseBurst(0.2, Math.min(0.35, 0.12 + intensity * 0.15), 900); this.blip(90, 0.12, 'sawtooth', 0.15); }

  skid() { this.noiseBurst(0.15, 0.1, 3200); }

  pickup() { this.blip(660, 0.06, 'triangle', 0.12); setTimeout(() => this.blip(990, 0.1, 'triangle', 0.1), 70); }

  hurt() { this.blip(180, 0.15, 'sawtooth', 0.2); }

  update() {
    if (!this.enabled) return;
    const g = this.game, p = g.player;
    // engine pitch follows speed in a vehicle
    if (p.currentVehicle && this.engineGain) {
      const spd = Math.hypot(p.currentVehicle.vx, p.currentVehicle.vy);
      this.engineOsc.frequency.value = 40 + spd * 0.6;
      this.engineGain.gain.value = 0.12;
    } else if (this.engineGain) {
      this.engineGain.gain.value = 0;
    }
    // siren when cops are close and wanted
    if (g.police.level > 0) {
      const near = g.police.cars.some(c => Math.hypot(c.x - p.x, c.y - p.y) < 700);
      if (near) this.siren(Math.floor(g.time * 2) % 2 === 0);
    }
  }
}
