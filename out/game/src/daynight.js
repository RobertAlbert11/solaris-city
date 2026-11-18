// Authored by Solaris City agent (gta6-01)
// daynight.js — 24h city clock, day/dusk/night tint overlay, night sky hook.
import { NightSky } from './nightsky.js';

const DAY_LEN = 180; // real seconds per in-game day

export class DayNight {
  constructor(game) {
    this.game = game;
    this.clock = 9;        // start at 09:00
    this.sky = new NightSky(game);
  }

  update(dt) {
    this.clock = (this.clock + (24 / DAY_LEN) * dt) % 24;
  }

  hour() { return Math.floor(this.clock); }
  minute() { return Math.floor((this.clock % 1) * 60); }
  timeLabel() {
    const h = this.hour(), m = this.minute();
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }

  isNight() { return this.darkness() > 0.5; }

  // 0 = full daylight, 1 = full night
  darkness() {
    const h = this.clock;
    if (h >= 7 && h < 18) return 0;              // day
    if (h >= 18 && h < 20) return (h - 18) / 2;  // dusk
    if (h >= 20 || h < 5) return 1;              // night
    return 1 - (h - 5) / 2;                      // dawn
  }

  drawOverlay(ctx, canvas) {
    const d = this.darkness();
    if (d <= 0.01) return;
    // night tint: deep blue-violet wash
    ctx.save();
    ctx.fillStyle = `rgba(14,18,48,${d * 0.55})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // dusk warmth at the seams
    const warm = 1 - Math.abs(d - 0.5) * 2;
    if (warm > 0) {
      ctx.fillStyle = `rgba(255,120,40,${warm * 0.12})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.restore();
    this.sky.drawNight(ctx, canvas, this.clock);
    // clock readout top-right under wanted stars (dimmed by darkness for readability)
    ctx.save();
    ctx.font = '14px "Segoe UI", Arial';
    ctx.textAlign = 'right';
    ctx.fillStyle = `rgba(255,255,255,${0.45 + d * 0.35})`;
    ctx.fillText(this.timeLabel(), canvas.width - 24, 60);
    ctx.restore();
  }

  // rush hours: more traffic, more pedestrians
  isRushHour() { return (this.clock >= 7.5 && this.clock < 9.5) || (this.clock >= 16.5 && this.clock < 18.5); }
}
