// Solaris City — effects.js (final authoring pass)
// Particle system: sparks, blood puffs, muzzle flashes, smoke, lingering decals,
// plus a full-screen flash for damage/bust moments.

// Hard cap so bursts can never spiral into a frame-rate death spiral.
const MAX_PARTICLES = 600;
// Drag applied to particle velocity each frame (per-second multiplicative).
const PARTICLE_DRAG = 0.94;
// Full-screen flash fades at this many alphas per second.
const FLASH_FADE_RATE = 4;
const FLASH_MAX_ALPHA = 0.45;

export class Effects {
  constructor(game) {
    this.game = game;
    this.particles = [];   // {x, y, vx, vy, life, maxLife, color, size}
    this.screenFlash = 0;
    this.flashColor = '';
  }

  // Shared spawn helper; silently drops particles past the cap.
  spawn(p) {
    if (this.particles.length < MAX_PARTICLES) this.particles.push(p);
  }

  sparkBurst(x, y, n = 14) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = 80 + Math.random() * 180;
      this.spawn({
        x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
        life: 0.5 + Math.random() * 0.4, maxLife: 0.9,
        color: Math.random() < 0.5 ? '#ffdd60' : '#ff8820',
        size: 2 + Math.random() * 3,
      });
    }
  }

  bloodPuff(x, y, n = 8) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = 30 + Math.random() * 80;
      this.spawn({
        x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
        life: 0.7 + Math.random() * 0.5, maxLife: 1.2,
        color: '#cc1f1f', size: 3 + Math.random() * 4,
      });
    }
  }

  // Cone of hot particles in the firing direction.
  muzzleFlash(x, y, dir) {
    for (let i = 0; i < 6; i++) {
      const a = dir + (Math.random() - 0.5) * 0.8;
      const spd = 120 + Math.random() * 80;
      this.spawn({
        x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
        life: 0.06 + Math.random() * 0.08, maxLife: 0.14,
        color: '#fff5a0', size: 4 + Math.random() * 3,
      });
    }
  }

  smokeCloud(x, y, n = 10) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = 10 + Math.random() * 30;
      this.spawn({
        x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
        life: 1.5 + Math.random(), maxLife: 2.5,
        color: 'rgba(80,80,90,0.6)', size: 8 + Math.random() * 12,
      });
    }
  }

  // Long-lived stationary decal (blood pool, scorch mark).
  splat(x, y, color = 'rgba(140,20,20,0.5)', size = 10) {
    this.spawn({ x, y, vx: 0, vy: 0, life: 6, maxLife: 6, color, size });
  }

  update(dt) {
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= PARTICLE_DRAG;
      p.vy *= PARTICLE_DRAG;
      p.life -= dt;
    }
    this.particles = this.particles.filter(p => p.life > 0);
    if (this.screenFlash > 0) this.screenFlash -= dt * FLASH_FADE_RATE;
  }

  // Trigger a full-screen flash (e.g. red on damage, blue on bust).
  flash(color) {
    this.screenFlash = 1;
    this.flashColor = color;
  }

  draw(ctx, cam) {
    for (const p of this.particles) {
      // Alpha fades over the second half of the particle's life.
      ctx.globalAlpha = Math.min(1, (p.life / p.maxLife) * 2);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, 7);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  drawOverlay(ctx, canvas) {
    if (this.screenFlash <= 0) return;
    ctx.globalAlpha = this.screenFlash * FLASH_MAX_ALPHA;
    ctx.fillStyle = this.flashColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 1;
  }
}
