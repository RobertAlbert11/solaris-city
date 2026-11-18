// Solaris City — audio.js (final authoring pass)
// Fully synthesized WebAudio: engine drone, gunshots, sirens, pickups, cash.
// No external audio files — everything is oscillators and noise buffers.

// Master volume for the whole mix.
const MASTER_VOLUME = 0.35;
// Minimum ms between gunshots so rapid fire doesn't stack into distortion.
const GUNSHOT_COOLDOWN_MS = 90;
// Engine tone range: idle frequency plus speed * multiplier.
const ENGINE_IDLE_HZ = 40;
const ENGINE_PITCH_PER_SPEED = 0.6;
const ENGINE_ON_FOOT_GAIN = 0;
const ENGINE_IN_CAR_GAIN = 0.12;

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
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      // Browsers hold contexts suspended until a user gesture resumes them.
      if (this.ctx.state === 'suspended') this.ctx.resume();
      this.master = this.ctx.createGain();
      this.master.gain.value = MASTER_VOLUME;
      this.master.connect(this.ctx.destination);
      this.buildEngine();
      this.enabled = true;
    } catch (e) {
      this.enabled = false;
    }
  }

  // Low sawtooth through a lowpass; gain keyed by whether we're driving.
  buildEngine() {
    this.engineOsc = this.ctx.createOscillator();
    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.value = ENGINE_IDLE_HZ;
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 220;
    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.value = ENGINE_ON_FOOT_GAIN;
    this.engineOsc.connect(lp);
    lp.connect(this.engineGain);
    this.engineGain.connect(this.master);
    this.engineOsc.start();
  }

  // Short oscillator tone with an exponential decay envelope.
  blip(freq = 660, dur = 0.1, type = 'square', vol = 0.15) {
    if (!this.enabled) return;
    try {
      const t = this.ctx.currentTime;
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = type;
      o.frequency.value = freq;
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(g);
      g.connect(this.master);
      o.start(t);
      o.stop(t + dur);
    } catch (e) { /* one-shot sounds are best-effort */ }
  }

  // Decaying white-noise burst through a lowpass — impacts, crashes, skids.
  noiseBurst(dur = 0.12, vol = 0.25, filterFreq = 1200) {
    if (!this.enabled) return;
    try {
      const n = Math.floor(this.ctx.sampleRate * dur);
      const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      // Linear ramp-down on the noise envelope so it clicks off cleanly.
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const f = this.ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = filterFreq;
      const g = this.ctx.createGain();
      g.gain.value = vol;
      src.connect(f);
      f.connect(g);
      g.connect(this.master);
      src.start();
    } catch (e) { /* ignore */ }
  }

  gunshot() {
    const now = performance.now();
    if (now - this.lastGun < GUNSHOT_COOLDOWN_MS) return;
    this.lastGun = now;
    this.noiseBurst(0.1, 0.3, 2400);
    this.blip(140, 0.06, 'sawtooth', 0.2);
  }

  // wail = long two-tone howl; short = quick yelp for close calls.
  siren(wail = true) {
    if (!this.enabled) return;
    const now = performance.now();
    if (now - this.lastSiren < (wail ? 700 : 250)) return;
    this.lastSiren = now;
    this.blip(wail ? 720 : 900, wail ? 0.5 : 0.16, 'sine', 0.08);
    if (wail) this.blip(540, 0.5, 'sine', 0.06);
  }

  cash() {
    this.blip(880, 0.08, 'square', 0.12);
    setTimeout(() => this.blip(1320, 0.12, 'square', 0.12), 90);
  }

  crash(intensity = 1) {
    this.noiseBurst(0.2, Math.min(0.35, 0.12 + intensity * 0.15), 900);
    this.blip(90, 0.12, 'sawtooth', 0.15);
  }

  skid() { this.noiseBurst(0.15, 0.1, 3200); }

  pickup() {
    this.blip(660, 0.06, 'triangle', 0.12);
    setTimeout(() => this.blip(990, 0.1, 'triangle', 0.1), 70);
  }

  hurt() { this.blip(180, 0.15, 'sawtooth', 0.2); }

  update() {
    if (!this.enabled) return;
    const g = this.game, p = g.player;
    // Engine pitch tracks speed while driving; silent on foot.
    if (p.currentVehicle && this.engineGain) {
      const spd = Math.hypot(p.currentVehicle.vx, p.currentVehicle.vy);
      this.engineOsc.frequency.value = ENGINE_IDLE_HZ + spd * ENGINE_PITCH_PER_SPEED;
      this.engineGain.gain.value = ENGINE_IN_CAR_GAIN;
    } else if (this.engineGain) {
      this.engineGain.gain.value = ENGINE_ON_FOOT_GAIN;
    }
    // Sirens only when cops are actually nearby and we're wanted.
    if (g.police.level > 0) {
      const near = g.police.cars.some(c => Math.hypot(c.x - p.x, c.y - p.y) < 700);
      if (near) this.siren(Math.floor(g.time * 2) % 2 === 0);
    }
  }
}
