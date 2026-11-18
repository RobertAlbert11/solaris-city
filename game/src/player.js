// Solaris City — player.js (rewritten polish pass)
// Diego Varga on foot and in stolen vehicles: movement, collision sliding,
// car jacking, bail-out damage, health/armor, death and respawn.

import { TILE, WORLD_W, WORLD_H, districtNameAt } from './world.js';

export const PLAYER_R = 9;

// Movement tuning.
const WALK_SPEED = 130;
const SPRINT_SPEED = 220;
// Health regen per second on foot while not wanted.
const REGEN_PER_SECOND = 2;
// Bail-out at speed hurts; scaled past this threshold.
const BAIL_HURT_SPEED = 150;
const BAIL_HURT_MAX = 25;
const BAIL_HURT_SCALE = 0.15;
// Range for jacking the nearest car.
const JACK_RANGE = 60;
// Spawn point (Solana Beach outskirts).
const SPAWN_X = 4 * TILE + 80;
const SPAWN_Y = 6 * TILE;
// Player stays this far inside the world bounds.
const BOUNDS_MARGIN = 20;
// Armor soaks this fraction of incoming damage.
const ARMOR_SOAK = 0.6;
// Respawn grants a small armor cushion.
const RESPAWN_ARMOR = 25;

export class Player {
  constructor(game) {
    this.game = game;
    this.x = SPAWN_X;
    this.y = SPAWN_Y;
    this.vx = 0;
    this.vy = 0;
    this.dir = 0;
    this.speed = 0;
    this.health = 100;
    this.armor = 0;
    this.name = 'Diego Varga';
    this.currentVehicle = null;
    this.fireCooldown = 0;
    this.deaths = 0;
    this.busts = 0;
  }

  update(dt) {
    const g = this.game;
    const inp = g.input;

    // Slow regen when hurt, on foot and not wanted.
    if (this.health > 0 && this.health < 100 && !g.police.level && !this.currentVehicle) {
      this.health = Math.min(100, this.health + dt * REGEN_PER_SECOND);
    }
    this.fireCooldown = Math.max(0, this.fireCooldown - dt);

    if (inp.consumeEnterExit()) {
      if (this.currentVehicle) this.exitVehicle();
      else this.tryEnterVehicle();
    }

    if (this.currentVehicle) this.updateDriving(dt, inp);
    else this.updateOnFoot(dt, inp);

    // Stay inside the world.
    this.x = Math.max(BOUNDS_MARGIN, Math.min(WORLD_W - BOUNDS_MARGIN, this.x));
    this.y = Math.max(BOUNDS_MARGIN, Math.min(WORLD_H - BOUNDS_MARGIN, this.y));

    if (this.health <= 0) g.hud.wasted();
    if (g.police.bustedCheck()) g.hud.busted();
  }

  updateOnFoot(dt, inp) {
    const { ax, ay } = inp.axis();
    const spd = inp.sprint() ? SPRINT_SPEED : WALK_SPEED;
    const l = Math.hypot(ax, ay) || 1;
    this.vx = (ax / l) * spd;
    this.vy = (ay / l) * spd;
    if (ax || ay) this.dir = Math.atan2(ay, ax);
    this.slideMove(dt);
  }

  // Axis-separated collision so the player slides along walls instead of sticking.
  slideMove(dt) {
    const w = this.game.world;
    let nx = this.x + this.vx * dt;
    if (w.collideRect({ x: nx - PLAYER_R, y: this.y - PLAYER_R, w: PLAYER_R * 2, h: PLAYER_R * 2 })) nx = this.x;
    let ny = this.y + this.vy * dt;
    if (w.collideRect({ x: this.x - PLAYER_R, y: ny - PLAYER_R, w: PLAYER_R * 2, h: PLAYER_R * 2 })) ny = this.y;
    this.x = nx;
    this.y = ny;
  }

  updateDriving(dt, inp) {
    const v = this.currentVehicle;
    const { ax, ay } = inp.axis();
    v.drive(dt, ax, ay, inp.handbrake());
    this.x = v.x;
    this.y = v.y;
    this.dir = v.dir;
  }

  // Closest enterable vehicle (civilian or police) within range.
  nearestVehicle(range = JACK_RANGE) {
    const g = this.game;
    let best = null;
    let bd = range * range;
    for (const v of [...g.traffic.vehicles, ...g.police.cars]) {
      const d = (v.x - this.x) ** 2 + (v.y - this.y) ** 2;
      if (d < bd) {
        bd = d;
        best = v;
      }
    }
    return best;
  }

  tryEnterVehicle() {
    const g = this.game;
    const v = this.nearestVehicle();
    if (!v) return;
    const stolen = v.kind !== 'owned';
    this.currentVehicle = v;
    v.driver = 'player';
    if (stolen) g.police.reportCrime('grand-theft-auto', this.x, this.y);
    g.hud.toast(`Entered ${v.brand} ${v.model}`);
  }

  exitVehicle() {
    const g = this.game;
    const v = this.currentVehicle;
    if (v) {
      // Bailing out at speed hurts.
      const spd = Math.hypot(v.vx, v.vy);
      if (spd > BAIL_HURT_SPEED) this.damage(Math.min(BAIL_HURT_MAX, (spd - BAIL_HURT_SPEED) * BAIL_HURT_SCALE));
      v.driver = null;
      v.vx *= 0.2;
      v.vy *= 0.2;
    }
    this.currentVehicle = null;
    // Step out to the side; if blocked by a building, try the other side.
    const side = v ? v.dir + Math.PI / 2 : 0;
    let ex = this.x + Math.cos(side) * 26;
    let ey = this.y + Math.sin(side) * 26;
    if (g.world.collideRect({ x: ex - PLAYER_R, y: ey - PLAYER_R, w: PLAYER_R * 2, h: PLAYER_R * 2 })) {
      ex = this.x - Math.cos(side) * 26;
      ey = this.y - Math.sin(side) * 26;
    }
    this.x = ex;
    this.y = ey;
    g.hud.toast(`On foot — ${districtNameAt(this.x, this.y)}`);
  }

  damage(n) {
    const g = this.game;
    // Armor soaks part of the hit first.
    const absorbed = Math.min(this.armor, n * ARMOR_SOAK);
    this.armor -= absorbed;
    this.health -= (n - absorbed);
    g.effects.bloodPuff(this.x, this.y);
    if (this.health <= 0 && g.state === 'playing') g.hud.wasted();
  }

  respawn() {
    this.health = 100;
    this.armor = RESPAWN_ARMOR;
    this.currentVehicle = null;
    this.x = SPAWN_X;
    this.y = SPAWN_Y;
    this.vx = 0;
    this.vy = 0;
  }

  draw(ctx) {
    const g = this.game;
    if (this.currentVehicle) {
      this.currentVehicle.drawSprite(ctx);
      drawShadow(ctx, this.x, this.y);
      return;
    }
    drawShadow(ctx, this.x, this.y);
    // Body faces movement direction.
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.dir + Math.PI / 2);
    ctx.fillStyle = '#e8b04a';
    ctx.beginPath();
    ctx.arc(0, 0, PLAYER_R, 0, 7);
    ctx.fill();
    ctx.fillStyle = '#2c2c38';
    ctx.fillRect(-PLAYER_R + 2, 2, (PLAYER_R - 2) * 2, 6);
    ctx.restore();
    // Drawn pistol when armed.
    if (g.combat.armed) {
      ctx.strokeStyle = '#222';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(this.x + Math.cos(this.dir) * 6, this.y + Math.sin(this.dir) * 6);
      ctx.lineTo(this.x + Math.cos(this.dir) * 16, this.y + Math.sin(this.dir) * 16);
      ctx.stroke();
    }
  }
}

function drawShadow(ctx, x, y) {
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(x + 4, y + 5, PLAYER_R + 2, PLAYER_R, 0, 0, 7);
  ctx.fill();
}
