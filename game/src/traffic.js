// Authored by Solaris City agent (gta6-01)
// traffic.js — NPC cars driving the road grid and pedestrians walking the sidewalks.
import { TILE, WORLD_W, WORLD_H } from './world.js';

const COLORS = ['#c94f4f', '#4f7fc9', '#c9b74f', '#5fc97a', '#c98f4f', '#9a5fc9', '#d9d9d9', '#3a3f4a'];
const BRANDS = ['Vulcan', 'Marlin', 'Cheetah', 'Duster', 'Sable', 'Comet', 'Pelican', 'Ravager'];
const PED_SKINS = ['#e8b04a', '#7fc9e8', '#e87fb0', '#9ae87f', '#c9c9c9'];

// Simple arcade car physics: throttle along facing, steering turns the car,
// handbrake reduces grip so the car drifts (velocity lags behind heading).
function driveCar(dt, ax, ay, handbrake) {
  const accel = 420;
  const maxSpeed = 340;
  const turnRate = 3.2;
  const grip = handbrake ? 1.8 : 6.5;

  const forwardX = Math.cos(this.dir), forwardY = Math.sin(this.dir);
  // project input axis onto car-forward (throttle) and car-right (steering)
  const throttleProj = ax * forwardX + ay * forwardY;
  const steerProj = ax * -forwardY + ay * forwardX;

  const speed = Math.hypot(this.vx, this.vy);
  let sp = speed;

  if (throttleProj !== 0) {
    sp += throttleProj * accel * dt;
    sp = Math.max(-120, Math.min(maxSpeed, sp));
  } else {
    // engine braking
    sp *= 1 - 1.2 * dt;
  }

  // steering: only when moving; reversed when driving backwards
  if (Math.abs(sp) > 5) {
    this.dir += steerProj * turnRate * dt * (sp >= 0 ? 1 : -1);
  }

  // velocity blends toward heading; low grip (handbrake) makes it lag => drift
  const newFx = Math.cos(this.dir), newFy = Math.sin(this.dir);
  const targetVx = newFx * sp, targetVy = newFy * sp;
  const k = Math.min(1, grip * dt);
  this.vx += (targetVx - this.vx) * k;
  this.vy += (targetVy - this.vy) * k;
  // extra push along heading when throttling (response at low speed)
  if (throttleProj !== 0) {
    const driveF = throttleProj >= 0 ? 1 : -1;
    this.vx += newFx * throttleProj * accel * dt * 0.35 * driveF;
    this.vy += newFy * throttleProj * accel * dt * 0.35 * driveF;
  }

  if (handbrake) {
    // handbrake scrubs speed
    this.vx *= 1 - 0.9 * dt;
    this.vy *= 1 - 0.9 * dt;
  }

  this.x += this.vx * dt;
  this.y += this.vy * dt;
}

export class Traffic {

  constructor(game) {
    this.game = game;
    this.vehicles = [];
    this.peds = [];
    for (let i = 0; i < 46; i++) this.spawnCar();
    for (let i = 0; i < 70; i++) this.spawnPed();
  }

  // Spawn a car on a random road lane, driving along it.
  spawnCar() {
    const horiz = Math.random() < 0.5;
    const lane = (Math.floor(Math.random() * (WORLD_W / (TILE * 8))) + 0.5) * TILE * 8;
    const t = Math.random() * (horiz ? WORLD_W : WORLD_H);
    const dirSign = Math.random() < 0.5 ? 1 : -1;
    const speed = 90 + Math.random() * 70;
    const v = {
      kind: 'traffic',
      brand: BRANDS[(Math.random() * BRANDS.length) | 0],
      model: ['GT', 'Sedan', 'Cruiser', 'Wagon'][(Math.random() * 4) | 0],
      color: COLORS[(Math.random() * COLORS.length) | 0],
      x: horiz ? t : lane + dirSign * 10,
      y: horiz ? lane + dirSign * 10 : t,
      vx: horiz ? dirSign * speed : 0,
      vy: horiz ? 0 : dirSign * speed,
      dir: horiz ? (dirSign > 0 ? 0 : Math.PI) : (dirSign > 0 ? Math.PI / 2 : -Math.PI / 2),
      speed, driver: 'npc', horiz, dirSign, w: 34, h: 16,
      bonk: 0, drive: driveCar,
    };
    this.vehicles.push(v);
    return v;
  }

  spawnPed() {
    const p = {
      x: Math.random() * WORLD_W, y: Math.random() * WORLD_H,
      vx: 0, vy: 0, dir: Math.random() * Math.PI * 2,
      skin: PED_SKINS[(Math.random() * PED_SKINS.length) | 0],
      timer: 0, dead: false, down: 0,
    };
    this.peds.push(p);
    return p;
  }

  update(dt) {
    const g = this.game;
    // cars: follow lane, respawn if far from player (keeps density around the action)
    for (const v of this.vehicles) {
      if (v.driver === 'player') continue;
      v.x += v.vx * dt; v.y += v.vy * dt;
      if (v.x < -80 || v.x > WORLD_W + 80 || v.y < -80 || v.y > WORLD_H + 80) {
        Object.assign(v, this.recycle(v));
      }
      // run over peds
      if (v.bonk > 0) v.bonk -= dt;
      for (const p of this.peds) {
        if (p.dead) continue;
        if (Math.abs(p.x - v.x) < 16 && Math.abs(p.y - v.y) < 16) {
          p.dead = true; p.down = 6; v.bonk = 0.4;
          if (v.driver === 'player') g.police.reportCrime('hit-and-run', v.x, v.y);
        }
      }
    }
    // despawn/respawn around player
    const px = g.player.x, py = g.player.y;
    for (const v of this.vehicles) {
      if (v.driver === 'player') continue;
      const d = Math.hypot(v.x - px, v.y - py);
      if (d > 2600) Object.assign(v, this.recycle(v));
    }
    // peds: wander, avoid roads-ish, flee when wanted
    const flee = g.police.level >= 2;
    for (const p of this.peds) {
      if (p.dead) { p.down -= dt; if (p.down <= 0) Object.assign(p, this.respawnPed(p, px, py)); continue; }
      p.timer -= dt;
      if (p.timer <= 0) {
        p.timer = 1 + Math.random() * 3;
        const a = Math.random() * Math.PI * 2;
        p.vx = Math.cos(a) * 30; p.vy = Math.sin(a) * 30;
      }
      if (flee) {
        const dx = p.x - px, dy = p.y - py, d = Math.hypot(dx, dy) || 1;
        if (d < 300) { p.vx = (dx / d) * 90; p.vy = (dy / d) * 90; }
      }
      let nx = p.x + p.vx * dt, ny = p.y + p.vy * dt;
      if (g.world.collideRect({ x: nx - 5, y: p.y - 5, w: 10, h: 10 })) nx = p.x;
      if (g.world.collideRect({ x: p.x - 5, y: ny - 5, w: 10, h: 10 })) ny = p.y;
      p.x = Math.max(10, Math.min(WORLD_W - 10, nx));
      p.y = Math.max(10, Math.min(WORLD_H - 10, ny));
      p.dir = Math.atan2(p.vy, p.vx);
      // ped killed by player driving
      if (!p.dead && g.player.currentVehicle && Math.hypot(p.x - px, p.y - py) < 16) {
        const v = g.player.currentVehicle;
        if (Math.hypot(v.vx, v.vy) > 60) { p.dead = true; p.down = 6; g.police.reportCrime('vehicular-manslaughter', p.x, p.y); }
      }
      // run over by npc handled above via vehicles loop; also player on foot bumps peds harmlessly
    }
  }

  recycle(v) {
    // respawn a free car near the player on a road
    const g = this.game;
    const horiz = Math.random() < 0.5;
    const lanes = [];
    for (let l = TILE * 4; l < WORLD_W; l += TILE * 8) lanes.push(l);
    const lane = lanes[(Math.random() * lanes.length) | 0];
    const dirSign = Math.random() < 0.5 ? 1 : -1;
    const t = g.player[horiz ? 'y' : 'x'] + (Math.random() * 1600 - 800);
    const speed = 90 + Math.random() * 70;
    return {
      ...v, kind: 'traffic', driver: 'npc', bonk: 0, drive: driveCar,
      x: horiz ? t : lane + dirSign * 10, y: horiz ? lane + dirSign * 10 : t,
      vx: horiz ? dirSign * speed : 0, vy: horiz ? 0 : dirSign * speed,
      dir: horiz ? (dirSign > 0 ? 0 : Math.PI) : (dirSign > 0 ? Math.PI / 2 : -Math.PI / 2),
      horiz, dirSign, speed,
    };
  }

  respawnPed(p, px, py) {
    const a = Math.random() * Math.PI * 2, r = 700 + Math.random() * 900;
    return { ...p, x: px + Math.cos(a) * r, y: py + Math.sin(a) * r, dead: false, down: 0, vx: 0, vy: 0, timer: 0 };
  }

  draw(ctx, cam) {
    // peds first (under cars)
    for (const p of this.peds) {
      if (Math.abs(p.x - cam.x) > cam.canvasW() + 60 || Math.abs(p.y - cam.y) > cam.canvasH() + 60) continue;
      if (p.dead) {
        ctx.fillStyle = 'rgba(120,20,20,0.6)';
        ctx.beginPath(); ctx.ellipse(p.x, p.y, 14, 8, 0, 0, 7); ctx.fill();
        continue;
      }
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath(); ctx.ellipse(p.x + 2, p.y + 3, 6, 5, 0, 0, 7); ctx.fill();
      ctx.fillStyle = p.skin;
      ctx.beginPath(); ctx.arc(p.x, p.y, 6, 0, 7); ctx.fill();
      ctx.fillStyle = '#2c2c38';
      ctx.fillRect(p.x - 5, p.y + 2, 10, 5);
    }
    // cars
    for (const v of this.vehicles) {
      if (Math.abs(v.x - cam.x) > cam.canvasW() + 80 || Math.abs(v.y - cam.y) > cam.canvasH() + 80) continue;
      drawCar(ctx, v);
    }
  }
}

export function drawCar(ctx, v) {
  ctx.save();
  ctx.translate(v.x, v.y);
  ctx.rotate(v.dir);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(-v.w / 2 + 3, -v.h / 2 + 4, v.w, v.h);
  ctx.fillStyle = v.color;
  ctx.fillRect(-v.w / 2, -v.h / 2, v.w, v.h);
  ctx.fillStyle = 'rgba(20,25,35,0.85)';
  ctx.fillRect(v.w / 2 - 12, -v.h / 2 + 3, 8, v.h - 6); // windshield
  ctx.fillRect(-v.w / 2 + 3, -v.h / 2 + 3, 5, v.h - 6);  // rear glass
  // headlights
  if (v.vx || v.vy || v.driver === 'player') {
    ctx.fillStyle = 'rgba(255,240,180,0.9)';
    ctx.fillRect(v.w / 2 - 2, -v.h / 2 + 1, 2, 4);
    ctx.fillRect(v.w / 2 - 2, v.h / 2 - 5, 2, 4);
  }
  if (v.siren) {
    const on = Math.floor(performance.now() / 200) % 2 === 0;
    ctx.fillStyle = on ? '#ff3b3b' : '#3b6bff';
    ctx.fillRect(-4, -v.h / 2 - 3, 8, 4);
  }
  ctx.restore();
}
