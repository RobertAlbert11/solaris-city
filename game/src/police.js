// Authored by Solaris City agent (gta6-01)
// police.js — wanted level, crimes, police cars that chase the player, busted logic.
import { TILE } from './world.js';

const CRIME_WEIGHTS = {
  'grand-theft-auto': 1,
  'hit-and-run': 1.5,
  'vehicular-manslaughter': 2,
  'gunfire': 0.8,
  'cop-ram': 2.5,
};

export class Police {
  constructor(game) {
    this.game = game;
    this.cars = [];
    this.level = 0;          // wanted stars 0..5
    this.heat = 0;           // progress within a star, decays when hidden
    this.spawnTimer = 0;
    this.busted = false;
    this.roadblocks = [];    // spawned at wanted 3+
    this.rbTimer = 0;
  }

  reportCrime(type, x, y) {
    const g = this.game;
    const w = CRIME_WEIGHTS[type] ?? 1;
    this.heat += w;
    const newLevel = Math.min(5, Math.floor(this.heat));
    if (newLevel > this.level) {
      this.level = newLevel;
      g.hud.toast(`WANTED — ${this.level} star${this.level > 1 ? 's' : ''}`);
      g.hud.flashWanted();
    }
    this.lastCrime = { x, y, t: g.time };
  }

  update(dt) {
    const g = this.game, p = g.player;
    const px = p.x, py = p.y;
    // decay heat slowly when not committing crimes
    if (g.time - (this.lastCrime?.t ?? -99) > 8) {
      this.heat = Math.max(0, this.heat - dt * 0.12);
      const dec = Math.min(5, Math.floor(this.heat));
      if (dec < this.level) { this.level = dec; if (this.level === 0) g.hud.toast('You lost the heat'); }
    }
    if (this.level === 0) { this.despawnAll(); return; }

    // spawn police proportional to wanted level, near the player on a road
    this.spawnTimer -= dt;
    const want = Math.min(6, this.level + 1);
    if (this.cars.length < want && this.spawnTimer <= 0) {
      this.spawnTimer = 2.5 - this.level * 0.3;
      this.spawnCop();
    }

    // roadblocks ahead of the player at wanted 3+
    if (this.level >= 3) {
      this.rbTimer -= dt;
      if (this.rbTimer <= 0 && this.roadblocks.length < 3) {
        this.rbTimer = 10;
        this.spawnRoadblock(px, py);
      }
    } else if (this.roadblocks.length) {
      this.roadblocks = [];
    }
    this.roadblocks = this.roadblocks.filter(rb => {
      const far = Math.hypot(rb.x - px, rb.y - py) > 1500;
      // hitting a barrier at speed stops you hard and busts it
      if (Math.abs(px - rb.x) < 30 && Math.abs(py - rb.y) < (rb.horiz ? 52 : 26)) {
        if (p.currentVehicle && Math.hypot(p.currentVehicle.vx, p.currentVehicle.vy) > 40) {
          p.currentVehicle.vx *= 0.15; p.currentVehicle.vy *= 0.15;
          g.effects.sparkBurst(px, py);
          g.camera.shake = 10;
          return false; // barrier smashed
        }
      }
      return !far;
    });

    // chase AI: drive straight at player, simple avoid-free pursuit
    for (const c of this.cars) {
      if (c.driver === 'player') continue;
      const dx = px - c.x, dy = py - c.y, d = Math.hypot(dx, dy) || 1;
      const spd = 150 + this.level * 18;
      c.vx = (dx / d) * spd; c.vy = (dy / d) * spd;
      c.dir = Math.atan2(dy, dx);
      c.x += c.vx * dt; c.y += c.vy * dt;
      // ram detection: cop hits player vehicle
      if (Math.hypot(px - c.x, py - c.y) < 26) {
        if (p.currentVehicle) {
          p.currentVehicle.vx *= 0.5; p.currentVehicle.vy *= 0.5;
          g.effects.sparkBurst(c.x, c.y);
          g.camera.shake = 8;
          // cops ramming you is not your crime; but if you ram them hard...
          const pv = p.currentVehicle;
          if (Math.hypot(pv.vx, pv.vy) > 120 && Math.sign(pv.vx) === Math.sign(-c.vx)) {
            // player drove into cop at speed
          }
        } else {
          p.damage(12 * dt * 6);
        }
      }
      // player ramming a cop = crime
      if (p.currentVehicle) {
        const pv = p.currentVehicle;
        if (Math.hypot(c.x - pv.x, c.y - pv.y) < 24 && Math.hypot(pv.vx, pv.vy) > 130 && (c.ramCd ?? 0) <= 0) {
          c.ramCd = 1.5;
          this.reportCrime('cop-ram', px, py);
        }
      }
      if (c.ramCd > 0) c.ramCd -= dt;
    }

    // busted: cop close while player on foot or nearly stopped
    if (!this.busted && this.level > 0) {
      const near = this.cars.some(c => Math.hypot(c.x - px, c.y - py) < 34);
      const slow = p.currentVehicle ? Math.hypot(p.currentVehicle.vx, p.currentVehicle.vy) < 30 : true;
      if (near && slow) this.busted = true;
    } else if (this.busted) {
      const near = this.cars.some(c => Math.hypot(c.x - px, c.y - py) < 40);
      if (!near) this.busted = false;
    }
  }

  // barrier across the nearest road, ~500u ahead of the player along their travel axis
  spawnRoadblock(px, py) {
    const horiz = Math.random() < 0.5;
    const dist = 400 + Math.random() * 250;
    const lanes = [];
    for (let l = TILE * 4; l < WORLD_LIMIT; l += TILE * 8) lanes.push(l);
    const lane = lanes.reduce((a, b) => Math.abs(b - py) < Math.abs(a - py) ? b : a);
    const along = Math.max(TILE * 4, Math.min(WORLD_LIMIT - TILE * 4, (horiz ? px : px) + dist));
    const alongY = Math.max(TILE * 4, Math.min(WORLD_LIMIT - TILE * 4, py + dist));
    this.roadblocks.push({
      horiz, x: horiz ? along : lane, y: horiz ? lane : alongY,
      w: horiz ? 26 : 90, h: horiz ? 90 : 26,
    });
    this.game.hud.toast('Roadblock ahead!');
  }

  bustedCheck() { return this.busted && this.level > 0; }

  spawnCop() {
    const g = this.game;
    const a = Math.random() * Math.PI * 2, r = 600 + Math.random() * 400;
    const x = Math.max(40, Math.min(WORLD_LIMIT - 40, g.player.x + Math.cos(a) * r));
    const y = Math.max(40, Math.min(WORLD_LIMIT - 40, g.player.y + Math.sin(a) * r));
    this.cars.push({
      kind: 'police', brand: 'Solara PD', model: 'Interceptor',
      color: '#e8e8f0', x, y, vx: 0, vy: 0, dir: a,
      speed: 180, driver: 'cop', w: 36, h: 17, siren: true, ramCd: 0,
    });
  }

  despawnAll() {
    // keep cop cars that the player stole (kind police + driver player)
    this.cars = this.cars.filter(c => c.driver === 'player');
  }

  clear() { this.cars = this.cars.filter(c => c.driver === 'player'); this.level = 0; this.heat = 0; this.busted = false; }

  draw(ctx, cam) {
    for (const c of this.cars) {
      if (Math.abs(c.x - cam.x) > cam.canvasW() + 80 || Math.abs(c.y - cam.y) > cam.canvasH() + 80) continue;
      drawCop(ctx, c);
    }
    for (const rb of this.roadblocks) {
      if (Math.abs(rb.x - cam.x) > cam.canvasW() + 100 || Math.abs(rb.y - cam.y) > cam.canvasH() + 100) continue;
      drawRoadblock(ctx, rb);
    }
  }
}

const WORLD_LIMIT = TILE * 120;

function drawRoadblock(ctx, rb) {
  ctx.save();
  // flashing beacon glow
  const on = Math.floor(performance.now() / 250) % 2 === 0;
  ctx.fillStyle = on ? 'rgba(255,60,60,0.9)' : 'rgba(60,110,255,0.9)';
  ctx.fillRect(rb.x - rb.w / 2 - 6, rb.y - rb.h / 2 - 6, rb.w + 12, rb.h + 12);
  // striped barriers
  ctx.fillStyle = '#e86a1a';
  ctx.fillRect(rb.x - rb.w / 2, rb.y - rb.h / 2, rb.w, rb.h);
  ctx.fillStyle = '#f5f0e6';
  const stripes = Math.floor((rb.horiz ? rb.h : rb.w) / 12);
  for (let i = 0; i < stripes; i++) {
    if (i % 2 === 0) continue;
    if (rb.horiz) ctx.fillRect(rb.x - rb.w / 2, rb.y - rb.h / 2 + i * 12, rb.w, 12);
    else ctx.fillRect(rb.x - rb.w / 2 + i * 12, rb.y - rb.h / 2, 12, rb.h);
  }
  ctx.restore();
}

function drawCop(ctx, c) {
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.rotate(c.dir);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(-c.w / 2 + 3, -c.h / 2 + 4, c.w, c.h);
  ctx.fillStyle = c.color;
  ctx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h);
  ctx.fillStyle = '#1a2f5a';
  ctx.fillRect(-c.w / 2 + 6, -c.h / 2, 10, c.h); // navy stripe
  ctx.fillStyle = 'rgba(20,25,35,0.85)';
  ctx.fillRect(c.w / 2 - 12, -c.h / 2 + 3, 8, c.h - 6);
  const on = Math.floor(performance.now() / 160) % 2 === 0;
  ctx.fillStyle = on ? '#ff2b2b' : '#2b6bff';
  ctx.fillRect(-5, -c.h / 2 - 4, 5, 5);
  ctx.fillStyle = on ? '#2b6bff' : '#ff2b2b';
  ctx.fillRect(1, -c.h / 2 - 4, 5, 5);
  ctx.restore();
}
