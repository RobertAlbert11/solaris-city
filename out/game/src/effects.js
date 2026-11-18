// Authored by Solaris City agent (gta6-01)
// effects.js — particle bursts: sparks, blood, bullet tracers, camera shake, flashbang.
export class Effects {
  constructor(game) {
    this.game = game;
    this.particles = [];   // {x,y,vx,vy,life,maxLife,color,size}
    this.screenFlash = 0;
    this.scrnColor = '';
  }

  _push(p) { if (this.particles.length < 600) this.particles.push(p); }

  sparkBurst(x, y, n = 14) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, spd = 80 + Math.random() * 180;
      this._push({ x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
        life: 0.5 + Math.random() * 0.4, maxLife: 0.9, color: Math.random() < 0.5 ? '#ffdd60' : '#ff8820', size: 2 + Math.random() * 3 });
    }
  }

  bloodPuff(x, y, n = 8) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, spd = 30 + Math.random() * 80;
      this._push({ x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
        life: 0.7 + Math.random() * 0.5, maxLife: 1.2, color: '#cc1f1f', size: 3 + Math.random() * 4 });
    }
  }

  muzzleFlash(x, y, dir) {
    const { cos, sin } = Math;
    for (let i = 0; i < 6; i++) {
      const a = dir + (Math.random() - 0.5) * 0.8, spd = 120 + Math.random() * 80;
      this._push({ x, y, vx: cos(a) * spd, vy: sin(a) * spd,
        life: 0.06 + Math.random() * 0.08, maxLife: 0.14, color: '#fff5a0', size: 4 + Math.random() * 3 });
    }
  }

  smokeCloud(x, y, n = 10) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, spd = 10 + Math.random() * 30;
      this._push({ x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
        life: 1.5 + Math.random(), maxLife: 2.5, color: 'rgba(80,80,90,0.6)', size: 8 + Math.random() * 12 });
    }
  }

  update(dt) {
    const g = this.game;
    for (const p of this.particles) {
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vx *= 0.94; p.vy *= 0.94;
      p.life -= dt;
    }
    this.particles = this.particles.filter(p => p.life > 0);
    if (this.screenFlash > 0) this.screenFlash -= dt * 4;
  }

  flash(color) {
    this.screenFlash = 1;
    this.scrnColor = color;
  }

  draw(ctx, cam) {
    // particles
    for (const p of this.particles) {
      const sx = p.x - cam.x, sy = p.y - cam.y;
      const alpha = Math.min(1, p.life / p.maxLife * 2);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(sx + cam.x, sy + cam.y, p.size, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  drawOverlay(ctx, canvas) {
    if (this.screenFlash > 0) {
      ctx.fillStyle = this.scrnColor;
      ctx.globalAlpha = this.screenFlash * 0.45;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = 1;
    }
  }

  // radial blood/impact splat that lingers as a decal
  splat(x, y, color = 'rgba(140,20,20,0.5)', size = 10) {
    this._push({ x, y, vx: 0, vy: 0, life: 6, maxLife: 6, color, size });
  }
}
