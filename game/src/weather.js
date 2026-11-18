// weather.js — rain / storm / fog cycle with canvas particles and lightning
export const WEATHER_TYPES = ['clear', 'rain', 'storm', 'fog'];

export class Weather {
  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.type = opts.start || 'clear';
    this.timer = 0;
    this.drops = [];
    this.flash = 0;
    this.changeIn = opts.cycle || 30; // seconds per phase
    this.spawn(opts.start);
  }

  spawn(type) {
    const w = this.canvas.width, h = this.canvas.height;
    this.drops = [];
    const count = type === 'rain' ? 220 : type === 'storm' ? 420 : 0;
    for (let i = 0; i < count; i++) {
      this.drops.push({
        x: Math.random() * w, y: Math.random() * h,
        len: 8 + Math.random() * 14, spd: 9 + Math.random() * 7,
        drift: type === 'storm' ? 3.2 : 1.1,
      });
    }
  }

  set(type) {
    if (!WEATHER_TYPES.includes(type)) return;
    this.type = type;
    this.spawn(type);
  }

  update(dt) {
    this.timer += dt;
    if (this.timer >= this.changeIn) { // cycle to next weather
      this.timer = 0;
      const idx = (WEATHER_TYPES.indexOf(this.type) + 1) % WEATHER_TYPES.length;
      this.set(WEATHER_TYPES[idx]);
    }
    const h = this.canvas.height;
    for (const d of this.drops) {
      d.y += d.spd * dt * 60;
      d.x += d.drift * dt * 60;
      if (d.y > h) { d.y = -d.len; d.x = Math.random() * this.canvas.width; }
    }
    if (this.type === 'storm') {
      this.flash -= dt;
      if (this.flash <= 0 && Math.random() < dt * 0.25) this.flash = 0.18; // lightning bolt
    } else this.flash = 0;
  }

  draw() {
    const c = this.ctx, w = this.canvas.width;
    if (this.type === 'fog') {
      c.fillStyle = 'rgba(200,205,215,0.28)';
      c.fillRect(0, 0, w, this.canvas.height);
    }
    if (this.drops.length) {
      c.strokeStyle = 'rgba(160,190,235,0.55)';
      c.lineWidth = 1.4;
      c.beginPath();
      for (const d of this.drops) {
        c.moveTo(d.x, d.y);
        c.lineTo(d.x - d.drift, d.y - d.len);
      }
      c.stroke();
    }
    if (this.flash > 0) { // lightning wash
      c.fillStyle = `rgba(255,255,255,${Math.min(0.55, this.flash * 3)})`;
      c.fillRect(0, 0, w, this.canvas.height);
    }
  }
}
