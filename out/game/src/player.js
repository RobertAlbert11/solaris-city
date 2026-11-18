// Authored by Solaris City agent (gta6-01)
// player.js — Diego Varga on foot and in stolen vehicles: movement, collision, car jacking, health, death & respawn.
import { TILE, WORLD_W, WORLD_H } from './world.js';
import { districtNameAt } from './world.js';

export const PLAYER_R = 9;

export class Player {
  constructor(game) {
    this.game = game;
    this.x = 4 * TILE + 80; this.y = 6 * TILE;
    this.vx = 0; this.vy = 0; this.dir = 0; this.speed = 0;
    this.health = 100; this.armor = 0;
    this.name = 'Diego Varga';
    this.currentVehicle = null;
    this.fireCooldown = 0;
    this.deaths = 0; this.busts = 0;
  }

  update(dt) {
    const g = this.game, inp = g.input, w = g.world;
    // slow health regen when healthy and on foot, out of wanted level
    if (this.health > 0 && this.health < 100 && !g.police.level && !this.currentVehicle) {
      this.health = Math.min(100, this.health + dt * 2);
    }
    this.fireCooldown = Math.max(0, this.fireCooldown - dt);
    if (inp.consumeEnterExit()) {
      if (this.currentVehicle) this.exitVehicle();
      else this.tryEnterVehicle();
    }
    if (this.currentVehicle) this.updateDriving(dt, inp);
    else this.updateOnFoot(dt, inp);
    // keep in world
    this.x = Math.max(20, Math.min(WORLD_W - 20, this.x));
    this.y = Math.max(20, Math.min(WORLD_H - 20, this.y));
    if (this.health <= 0) g.hud.wasted();
    if (g.police.bustedCheck()) g.hud.busted();
  }

  updateOnFoot(dt, inp) {
    const { ax, ay } = inp.axis();
    const spd = inp.sprint() ? 220 : 130;
    const l = Math.hypot(ax, ay) || 1;
    this.vx = (ax / l) * spd; this.vy = (ay / l) * spd;
    if (ax || ay) this.dir = Math.atan2(ay, ax);
    // collision: slide against buildings
    let nx = this.x + this.vx * dt;
    if (w.collideRect({ x: nx - PLAYER_R, y: this.y - PLAYER_R, w: PLAYER_R * 2, h: PLAYER_R * 2 })) nx = this.x;
    let ny = this.y + this.vy * dt;
    if (w.collideRect({ x: this.x - PLAYER_R, y: ny - PLAYER_R, w: PLAYER_R * 2, h: PLAYER_R * 2 })) ny = this.y;
    this.x = nx; this.y = ny;
  }

  updateDriving(dt, inp) {
    const v = this.currentVehicle;
    const { ax, ay } = inp.axis();
    v.drive(dt, ax, ay, inp.handbrake());
    this.x = v.x; this.y = v.y; this.dir = v.dir;
    // run over pedestrians handled by traffic; police contact by police module
  }

  nearestVehicle(range = 60) {
    const g = this.game;
    let best = null, bd = range * range;
    for (const v of g.traffic.vehicles) {
      const d = (v.x - this.x) ** 2 + (v.y - this.y) ** 2;
      if (d < bd) { bd = d; best = v; }
    }
    for (const v of g.police.cars) {
      const d = (v.x - this.x) ** 2 + (v.y - this.y) ** 2;
      if (d < bd) { bd = d; best = v; }
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
    if (stolen) { g.police.reportCrime('grand-theft-auto', this.x, this.y); }
    g.hud.toast(`Entered ${v.brand} ${v.model}`);
  }

  exitVehicle() {
    const g = this.game;
    const v = this.currentVehicle;
    if (v) {
      // bailing out at speed hurts
      const spd = Math.hypot(v.vx, v.vy);
      if (spd > 150) this.damage(Math.min(25, (spd - 150) * 0.15));
      v.driver = null; v.vx *= 0.2; v.vy *= 0.2;
    }
    this.currentVehicle = null;
    // step out to the side; if that spot is inside a building, try the other side
    const side = (v ? v.dir + Math.PI / 2 : 0);
    let ex = this.x + Math.cos(side) * 26, ey = this.y + Math.sin(side) * 26;
    if (g.world.collideRect({ x: ex - PLAYER_R, y: ey - PLAYER_R, w: PLAYER_R * 2, h: PLAYER_R * 2 })) {
      ex = this.x - Math.cos(side) * 26; ey = this.y - Math.sin(side) * 26;
    }
    this.x = ex; this.y = ey;
    g.hud.toast('On foot');
  }

  damage(n) {
    const g = this.game;
    const abs = Math.min(this.armor, n * 0.6);
    this.armor -= abs; this.health -= (n - abs);
    g.effects.bloodPuff(this.x, this.y);
    if (this.health <= 0 && g.state === 'playing') g.hud.wasted();
  }

  respawn() {
    this.health = 100; this.armor = 25;
    this.currentVehicle = null;
    this.x = 4 * TILE + 80; this.y = 6 * TILE;
    this.vx = this.vy = 0;
  }

  draw(ctx) {
    const g = this.game;
    if (this.currentVehicle) { this.currentVehicle.drawSprite(ctx); drawShadow(ctx, this.x, this.y); return; }
    drawShadow(ctx, this.x, this.y);
    // body
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.dir + Math.PI / 2);
    ctx.fillStyle = '#e8b04a';
    ctx.beginPath(); ctx.arc(0, 0, PLAYER_R, 0, 7); ctx.fill();
    ctx.fillStyle = '#2c2c38';
    ctx.fillRect(-PLAYER_R + 2, 2, (PLAYER_R - 2) * 2, 6); // shoulders/legs
    ctx.restore();
    // weapon if armed
    if (g.combat.armed) {
      ctx.strokeStyle = '#222'; ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(this.x + Math.cos(this.dir) * 6, this.y + Math.sin(this.dir) * 6);
      ctx.lineTo(this.x + Math.cos(this.dir) * 16, this.y + Math.sin(this.dir) * 16);
      ctx.stroke();
    }
  }
}

function drawShadow(ctx, x, y) {
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath(); ctx.ellipse(x + 4, y + 5, PLAYER_R + 2, PLAYER_R, 0, 0, 7); ctx.fill();
}
