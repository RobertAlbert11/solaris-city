// Solaris City — combat.js (final authoring pass)
// Pistol combat: mouse aiming, F/click to fire, tracers, rival gang AI,
// ammo with auto-reload, and crime reporting hooking into the police system.

import { TILE } from './world.js';

const START_AMMO = 60;
const MAG_SIZE = 60;
const MAX_RESERVE = 240;
const RELOAD_SECONDS = 2.2;
const FIRE_COOLDOWN = 0.18;
const BULLET_SPEED = 620;
const BULLET_LIFE = 0.7;
const ENEMY_BULLET_SPEED = 480;
const ENEMY_DAMAGE = 8;
const PED_HIT_RADIUS = 8;
const COP_HIT_RADIUS = 14;
const ENEMY_HIT_RADIUS = 9;
const PLAYER_HIT_RADIUS = 10;
const BULLET_BUILDING_HALF = 2;
const ENEMY_HEALTH = 40;
const ENEMY_BULLET_DAMAGE = 20;
const ENEMY_KILL_CASH = 25;
const ENEMY_KILL_RESPECT = 5;
const ENEMY_AGGRO_RANGE = 260;
const ENEMY_FIRE_COOLDOWN_BASE = 1.2;

export class Combat {
  constructor(game) {
    this.game = game;
    this.armed = true;
    this.ammo = START_AMMO;
    this.magSize = MAG_SIZE;
    this.maxAmmo = MAX_RESERVE;
    this.reloadTime = 0;
    this.bullets = [];   // {x, y, dx, dy, life, speed, hostile}
    this.enemies = [];   // rival gang members
    this.spawnEnemies();
  }

  // 5 rivals loitering in Mariposa Ward — targets for the elimination mission.
  spawnEnemies() {
    const wardX = 88, wardY = 60;
    for (let i = 0; i < 5; i++) {
      this.enemies.push({
        x: (wardX + 2 + (i % 3) * 3) * TILE,
        y: (wardY + 2 + Math.floor(i / 3) * 4) * TILE,
        vx: 0, vy: 0,
        dir: Math.random() * Math.PI * 2,
        health: ENEMY_HEALTH,
        maxHealth: ENEMY_HEALTH,
        dead: false,
        color: '#b04fc9',
        fireCd: 0,
      });
    }
  }

  reloadTick(dt) {
    const g = this.game;
    if (this.reloadTime > 0) {
      this.reloadTime -= dt;
      if (this.reloadTime <= 0 && this.ammo < this.magSize) {
        const take = Math.min(this.magSize - this.ammo, this.maxAmmo);
        this.ammo += take;
        this.maxAmmo -= take;
        g.audio.blip(520, 0.08, 'square', 0.1);
      }
    } else if (this.ammo <= 0 && this.maxAmmo > 0) {
      this.reloadTime = RELOAD_SECONDS;
      g.hud.toast('Reloading...');
    }
  }

  tryFire() {
    const g = this.game;
    const p = g.player;
    if (!g.input.consumeFire() || !this.armed || this.ammo <= 0 || p.fireCooldown > 0) return;
    p.fireCooldown = FIRE_COOLDOWN;
    this.ammo--;
    const dir = p.dir;
    const mx = p.x + Math.cos(dir) * 16;
    const my = p.y + Math.sin(dir) * 16;
    this.bullets.push({
      x: p.x + Math.cos(dir) * 14,
      y: p.y + Math.sin(dir) * 14,
      dx: Math.cos(dir),
      dy: Math.sin(dir),
      life: BULLET_LIFE,
      speed: BULLET_SPEED,
    });
    g.effects.muzzleFlash(mx, my, dir);
    g.audio.gunshot();
    g.police.reportCrime('gunfire', p.x, p.y);
  }

  moveBullets(dt) {
    const g = this.game;
    for (const b of this.bullets) {
      b.x += b.dx * b.speed * dt;
      b.y += b.dy * b.speed * dt;
      b.life -= dt;
      if (b.life <= 0) continue;
      // Walls stop bullets with a spark.
      if (g.world.collideRect({
        x: b.x - BULLET_BUILDING_HALF,
        y: b.y - BULLET_BUILDING_HALF,
        w: BULLET_BUILDING_HALF * 2,
        h: BULLET_BUILDING_HALF * 2,
      })) {
        g.effects.sparkBurst(b.x, b.y, 4);
        b.life = 0;
        continue;
      }
      this.bulletHits(b);
    }
    this.bullets = this.bullets.filter(b => b.life > 0);
  }

  bulletHits(b) {
    const g = this.game;
    // Peds go down and count as murder.
    for (const ped of g.traffic.peds) {
      if (!ped.dead && Math.hypot(ped.x - b.x, ped.y - b.y) < PED_HIT_RADIUS) {
        ped.dead = true;
        ped.down = 6;
        g.effects.bloodPuff(ped.x, ped.y);
        g.police.reportCrime('murder', b.x, b.y);
        b.life = 0;
        return;
      }
    }
    // Cop cars spark and anger the department.
    for (const cop of g.police.cars) {
      if (cop.driver === 'player') continue;
      if (Math.hypot(cop.x - b.x, cop.y - b.y) < COP_HIT_RADIUS) {
        g.effects.sparkBurst(b.x, b.y, 6);
        g.police.reportCrime('cop-ram', b.x, b.y);
        b.life = 0;
        return;
      }
    }
    // Rival gang members take chip damage; kills pay out.
    for (const e of this.enemies) {
      if (e.dead) continue;
      if (Math.hypot(e.x - b.x, e.y - b.y) < ENEMY_HIT_RADIUS) {
        e.health -= ENEMY_BULLET_DAMAGE;
        g.effects.bloodPuff(e.x, e.y);
        if (e.health <= 0) {
          e.dead = true;
          g.missions.eliminateCount++;
          g.respect += ENEMY_KILL_RESPECT;
          g.cash += ENEMY_KILL_CASH;
          g.audio.pickup();
        }
        b.life = 0;
        return;
      }
    }
  }

  updateEnemyAI(dt) {
    const g = this.game;
    const p = g.player;
    for (const e of this.enemies) {
      if (e.dead) continue;
      e.fireCd -= dt;
      if (Math.hypot(e.x - p.x, e.y - p.y) < ENEMY_AGGRO_RANGE && e.fireCd <= 0) {
        e.fireCd = ENEMY_FIRE_COOLDOWN_BASE + Math.random();
        const dir = Math.atan2(p.y - e.y, p.x - e.x);
        e.dir = dir;
        this.bullets.push({
          x: e.x, y: e.y,
          dx: Math.cos(dir), dy: Math.sin(dir),
          life: BULLET_LIFE,
          speed: ENEMY_BULLET_SPEED,
          hostile: true,
        });
      }
    }
  }

  update(dt) {
    this.reloadTick(dt);
    this.tryFire();
    this.moveBullets(dt);
    this.updateEnemyAI(dt);
    // Hostile bullets that connect chip the player's health.
    const p = this.game.player;
    for (const b of this.bullets) {
      if (b.hostile && Math.hypot(b.x - p.x, b.y - p.y) < PLAYER_HIT_RADIUS) {
        p.damage(ENEMY_DAMAGE);
        b.life = 0;
      }
    }
  }

  draw(ctx, cam) {
    this.drawEnemies(ctx, cam);
    this.drawTracers(ctx);
  }

  drawEnemies(ctx, cam) {
    for (const e of this.enemies) {
      if (e.dead) continue;
      if (Math.abs(e.x - cam.x) > cam.canvasW() + 40 || Math.abs(e.y - cam.y) > cam.canvasH() + 40) continue;
      // Drop shadow.
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.ellipse(e.x + 2, e.y + 3, 7, 6, 0, 0, 7);
      ctx.fill();
      ctx.fillStyle = e.color;
      ctx.beginPath();
      ctx.arc(e.x, e.y, 7, 0, 7);
      ctx.fill();
      // Health bar once damaged.
      if (e.health < e.maxHealth) {
        ctx.fillStyle = '#300';
        ctx.fillRect(e.x - 9, e.y - 14, 18, 3);
        ctx.fillStyle = '#e34';
        ctx.fillRect(e.x - 9, e.y - 14, 18 * Math.max(0, e.health / e.maxHealth), 3);
      }
      // Aimed gun barrel.
      ctx.strokeStyle = '#222';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(e.x + Math.cos(e.dir) * 6, e.y + Math.sin(e.dir) * 6);
      ctx.lineTo(e.x + Math.cos(e.dir) * 15, e.y + Math.sin(e.dir) * 15);
      ctx.stroke();
    }
  }

  drawTracers(ctx) {
    ctx.lineWidth = 2;
    for (const b of this.bullets) {
      ctx.strokeStyle = b.hostile ? '#ff6a6a' : '#ffe9a0';
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(b.x - b.dx * 12, b.y - b.dy * 12);
      ctx.stroke();
    }
  }
}
