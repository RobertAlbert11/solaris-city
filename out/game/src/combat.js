// Authored by Solaris City agent (gta6-01)
// combat.js — pistol shooting: aim with mouse, fire with F or click, hit peds/cops, ammo & pickups.
export class Combat {
  constructor(game) {
    this.game = game;
    this.armed = true;
    this.ammo = 60;
    this.magSize = 60;
    this.maxAmmo = 240;
    this.reloadTime = 0;
    this.bullets = [];      // {x,y,dx,dy,life,speed}
    this.enemies = [];      // rival gang members
    this.spawnEnemies();
  }

  spawnEnemies() {
    // 5 rival gang members loitering in Mariposa Ward for the elimination mission
    const wardX = 88, wardY = 60;
    for (let i = 0; i < 5; i++) {
      this.enemies.push({
        x: (wardX + 2 + (i % 3) * 3) * 40,
        y: (wardY + 2 + Math.floor(i / 3) * 4) * 40,
        vx: 0, vy: 0, dir: Math.random() * Math.PI * 2,
        health: 40, dead: false, color: '#b04fc9', fireCd: 0,
      });
    }
  }

  update(dt) {
    const g = this.game, p = g.player;
    const inp = g.input;

    // reload: auto-refill magazine from reserve every 2.2s when empty
    if (this.reloadTime > 0) {
      this.reloadTime -= dt;
      if (this.reloadTime <= 0 && this.ammo < this.magSize) {
        const need = this.magSize - this.ammo;
        const take = Math.min(need, this.maxAmmo);
        this.ammo += take; this.maxAmmo -= take;
        g.audio.blip(520, 0.08, 'square', 0.1);
      }
    } else if (this.ammo <= 0 && this.maxAmmo > 0) {
      this.reloadTime = 2.2;
      g.hud.toast('Reloading...');
    }
    // firing
    if (inp.consumeFire() && this.armed && this.ammo > 0 && p.fireCooldown <= 0) {
      p.fireCooldown = 0.18;
      this.ammo--;
      const dir = p.dir;
      this.bullets.push({
        x: p.x + Math.cos(dir) * 14, y: p.y + Math.sin(dir) * 14,
        dx: Math.cos(dir), dy: Math.sin(dir), life: 0.7, speed: 620,
      });
      g.effects.muzzleFlash(p.x + Math.cos(dir) * 16, p.y + Math.sin(dir) * 16, dir);
      g.audio.gunshot();
      g.police.reportCrime('gunfire', p.x, p.y);
    }

    // bullets fly and hit things
    for (const b of this.bullets) {
      b.x += b.dx * b.speed * dt;
      b.y += b.dy * b.speed * dt;
      b.life -= dt;
      // hit buildings
      if (g.world.collideRect({ x: b.x - 2, y: b.y - 2, w: 4, h: 4 })) {
        g.effects.sparkBurst(b.x, b.y, 4);
        b.life = 0;
        continue;
      }
      // hit peds
      for (const ped of g.traffic.peds) {
        if (!ped.dead && Math.hypot(ped.x - b.x, ped.y - b.y) < 8) {
          ped.dead = true; ped.down = 6;
          g.effects.bloodPuff(ped.x, ped.y);
          g.police.reportCrime('murder', b.x, b.y);
          b.life = 0;
          break;
        }
      }
      // hit cops
      for (const cop of g.police.cars) {
        if (cop.driver === 'player') continue;
        if (Math.hypot(cop.x - b.x, cop.y - b.y) < 14) {
          g.effects.sparkBurst(b.x, b.y, 6);
          g.police.reportCrime('cop-ram', b.x, b.y);
          b.life = 0;
          break;
        }
      }
      // hit rival gang members
      for (const e of this.enemies) {
        if (e.dead) continue;
        if (Math.hypot(e.x - b.x, e.y - b.y) < 9) {
          e.health -= 20;
          g.effects.bloodPuff(e.x, e.y);
          if (e.health <= 0) {
            e.dead = true;
            g.missions.eliminateCount++;
            g.respect += 5;
            g.cash += 25;
            g.audio.pickup();
          }
          b.life = 0;
          break;
        }
      }
    }
    this.bullets = this.bullets.filter(b => b.life > 0);

    // enemies shoot back when player near & wanted
    for (const e of this.enemies) {
      if (e.dead) continue;
      e.fireCd -= dt;
      const d = Math.hypot(e.x - p.x, e.y - p.y);
      if (d < 260 && e.fireCd <= 0) {
        e.fireCd = 1.2 + Math.random();
        const dir = Math.atan2(p.y - e.y, p.x - e.x);
        this.bullets.push({
          x: e.x, y: e.y, dx: Math.cos(dir), dy: Math.sin(dir), life: 0.7, speed: 480, hostile: true,
        });
      }
      // hostile bullets damage player (checked here for simplicity)
    }
    for (const b of this.bullets) {
      if (b.hostile && Math.hypot(b.x - p.x, b.y - p.y) < 10) {
        p.damage(8);
        b.life = 0;
      }
    }
  }

  draw(ctx, cam) {
    // enemies
    for (const e of this.enemies) {
      if (e.dead) continue;
      if (Math.abs(e.x - cam.x) > cam.canvasW() + 40 || Math.abs(e.y - cam.y) > cam.canvasH() + 40) continue;
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath(); ctx.ellipse(e.x + 2, e.y + 3, 7, 6, 0, 0, 7); ctx.fill();
      ctx.fillStyle = e.color;
      ctx.beginPath(); ctx.arc(e.x, e.y, 7, 0, 7); ctx.fill();
      // health bar when damaged
      if (e.health < 40) {
        ctx.fillStyle = '#300'; ctx.fillRect(e.x - 9, e.y - 14, 18, 3);
        ctx.fillStyle = '#e34'; ctx.fillRect(e.x - 9, e.y - 14, 18 * Math.max(0, e.health / 40), 3);
      }
      // little gun
      ctx.strokeStyle = '#222'; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(e.x + Math.cos(e.dir) * 6, e.y + Math.sin(e.dir) * 6);
      ctx.lineTo(e.x + Math.cos(e.dir) * 15, e.y + Math.sin(e.dir) * 15);
      ctx.stroke();
    }
    // bullets as tracers
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
