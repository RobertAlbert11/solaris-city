// Solaris City — daynight.js (rewritten polish pass)
// 24-hour city clock driving the tint overlay, night sky and rush-hour traffic.

import { NightSky } from './nightsky.js';

// Real seconds per full in-game day.
const DAY_LENGTH_SECONDS = 180;
// Clock starts at 09:00.
const START_HOUR = 9;

// Darkness schedule boundaries (hours).
const DAWN_START = 5;
const DAY_START = 7;
const DUSK_START = 18;
const NIGHT_START = 20;
const DUSK_LENGTH_HOURS = 2;

// Overlay alphas.
const NIGHT_TINT_MAX = 0.55;
const DUSK_WARM_MAX = 0.12;

const NIGHT_COLOR = '14,18,48';
const WARM_COLOR = '255,120,40';

export class DayNight {
  constructor(game) {
    this.game = game;
    this.clock = START_HOUR;
    this.sky = new NightSky(game);
  }

  update(dt) {
    const hoursPerSecond = 24 / DAY_LENGTH_SECONDS;
    this.clock = (this.clock + hoursPerSecond * dt) % 24;
  }

  hour() { return Math.floor(this.clock); }
  minute() { return Math.floor((this.clock % 1) * 60); }

  timeLabel() {
    const h = this.hour().toString().padStart(2, '0');
    const m = this.minute().toString().padStart(2, '0');
    return `${h}:${m}`;
  }

  isNight() { return this.darkness() > 0.5; }

  // 0 = full daylight, 1 = full night. Linear ramps at dawn/dusk.
  darkness() {
    const h = this.clock;
    if (h >= DAY_START && h < DUSK_START) return 0;                       // day
    if (h >= DUSK_START && h < NIGHT_START) {                             // dusk
      return (h - DUSK_START) / DUSK_LENGTH_HOURS;
    }
    if (h >= NIGHT_START || h < DAWN_START) return 1;                     // night
    return 1 - (h - DAWN_START) / DUSK_LENGTH_HOURS;                      // dawn
  }

  drawOverlay(ctx, canvas) {
    const d = this.darkness();
    if (d > 0.01) {
      ctx.save();
      // Deep blue-violet wash that thickens as night falls.
      ctx.fillStyle = `rgba(${NIGHT_COLOR},${d * NIGHT_TINT_MAX})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      // Warm orange flash at the dusk/dawn seams.
      const warm = 1 - Math.abs(d - 0.5) * 2;
      if (warm > 0) {
        ctx.fillStyle = `rgba(${WARM_COLOR},${warm * DUSK_WARM_MAX})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      ctx.restore();
    }
    this.sky.drawNight(ctx, canvas, this.clock);
    // Clock readout under the wanted stars; brighter at night for readability.
    ctx.save();
    ctx.font = '14px "Segoe UI", Arial';
    ctx.textAlign = 'right';
    ctx.fillStyle = `rgba(255,255,255,${0.45 + d * 0.35})`;
    ctx.fillText(this.timeLabel(), canvas.width - 24, 60);
    ctx.restore();
  }

  // Morning and evening peaks: heavier traffic and more pedestrians.
  isRushHour() {
    return (this.clock >= 7.5 && this.clock < 9.5)
        || (this.clock >= 16.5 && this.clock < 18.5);
  }
}
