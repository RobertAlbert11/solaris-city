// Authored by Solaris City agent (gta6-01)
// nightsky.js — star field and crescent moon for night hours.
export class NightSky {
  constructor(game) {
    this.game = game;
    this.stars = [];
    for (let i = 0; i < 280; i++) {
      this.stars.push({
        x: Math.random(), y: Math.random() * 0.65,  // normalised screen fractions
        r: Math.random() < 0.15 ? 1.8 : 1.0,
        phase: Math.random() * Math.PI * 2,
      });
    }
    // register draw hook — night sky is drawn as a background layer via daynight overlay
    game.nightSky = this;
  }

  drawNight(ctx, canvas, hour) {
    // draw only during dark hours (between 20:00 and 06:00)
    const h = hour % 24;
    if (h >= 6 && h < 20) return;  // no night sky during day

    const dark = h < 6 ? 1 - h / 6 : (h >= 20 ? (h - 20) / 4 : 0);
    ctx.save();
    ctx.globalAlpha = Math.min(0.85, dark * 0.9);
    for (const s of this.stars) {
      const blink = 0.6 + 0.4 * Math.sin(s.phase + performance.now() / 1000);
      ctx.globalAlpha = Math.min(0.85, dark * 0.9) * blink;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(s.x * canvas.width, s.y * canvas.height, s.r, 0, 7);
      ctx.fill();
    }
    // shooting star (rare, deep night only)
    if (dark > 0.9 && Math.random() < 0.004) {
      const sx = Math.random() * canvas.width, sy = Math.random() * canvas.height * 0.3;
      ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + 40, sy + 14); ctx.stroke();
    }
    // crescent moon with a soft glow halo
    ctx.globalAlpha = Math.min(0.9, dark * 0.85);
    const mx = canvas.width * 0.82, my = canvas.height * 0.1;
    const glow = ctx.createRadialGradient(mx, my, 10, mx, my, 60);
    glow.addColorStop(0, 'rgba(255,224,144,0.35)');
    glow.addColorStop(1, 'rgba(255,224,144,0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(mx, my, 60, 0, 7); ctx.fill();
    ctx.fillStyle = '#ffe090';
    ctx.beginPath(); ctx.arc(mx, my, 22, 0, 7); ctx.fill();
    ctx.fillStyle = '#1a1e30';  // overlap to carve crescent
    ctx.beginPath(); ctx.arc(mx + 14, my - 4, 19, 0, 7); ctx.fill();
    ctx.restore();
  }
}
