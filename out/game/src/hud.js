// Authored by Solaris City agent (gta6-01)
// hud.js — wanted stars, cash, respect, health/armor bars, mission text, toasts, pause/wasted overlays.
export class Hud {
  constructor(game) {
    this.game = game;
    this.toasts = [];           // {text, until}
    this.flash = 0;
    this.blink = 0;
  }

  toast(text) {
    this.toasts.push({ text, until: this.game.time + 4 });
    if (this.toasts.length > 4) this.toasts.shift();
  }

  update(dt) {
    if (this.flash > 0) this.flash -= dt;
  }
  flashWanted() { this.flash = 1.2; }

  wasted() {
    const g = this.game;
    if (g.state !== 'playing') return;
    g.state = 'wasted';
    g.missions.fail('Wasted');
    setTimeout(() => {
      g.player.respawn();
      g.police.clear();
      g.state = 'playing';
    }, 2500);
  }

  busted() {
    const g = this.game;
    if (g.state !== 'playing') return;
    g.state = 'busted';
    g.cash = Math.max(0, g.cash - 100);
    g.missions.fail('Busted');
    setTimeout(() => {
      g.player.respawn();
      g.police.clear();
      g.state = 'playing';
    }, 2500);
  }

  update(dt) {
    if (this.flash > 0) this.flash -= dt;
  }

  draw(ctx, canvas) {
    const g = this.game;
    const w = canvas.width, h = canvas.height;

    // top-right: wanted stars
    const stars = g.police.level;
    if (stars > 0 || this.flash > 0) {
      ctx.save();
      ctx.font = 'bold 28px "Segoe UI", Arial';
      ctx.textAlign = 'right';
      if (this.flash > 0) {
        if (Math.floor(this.flash * 8) % 2 === 0) {
          ctx.fillStyle = '#ff4b4b';
          ctx.fillText('★'.repeat(Math.max(stars, 1)) + '☆'.repeat(5 - Math.max(stars, 1)), w - 24, 40);
        }
      } else {
        ctx.fillStyle = '#ffd23c';
        ctx.fillText('★'.repeat(stars) + '☆'.repeat(5 - stars), w - 24, 40);
      }
      ctx.restore();
    }

    // top-left: cash, respect, health, armor
    ctx.save();
    ctx.font = 'bold 22px "Segoe UI", Arial';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#7fe8a0';
    ctx.fillText(`$${g.cash}`, 20, 34);
    ctx.font = '16px "Segoe UI", Arial';
    ctx.fillStyle = '#ffd9a8';
    ctx.fillText(`Respect ${g.respect}`, 20, 58);
    // health bar
    const hw = 180;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(20, 68, hw, 10);
    ctx.fillStyle = g.player.health > 30 ? '#4fc96f' : '#e84f4f';
    ctx.fillRect(20, 68, hw * Math.max(0, g.player.health) / 100, 10);
    if (g.player.armor > 0) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(20, 82, hw, 7);
      ctx.fillStyle = '#6fb0e8';
      ctx.fillRect(20, 82, hw * g.player.armor / 100, 7);
    }
    // vehicle name / speed
    if (g.player.currentVehicle) {
      const v = g.player.currentVehicle;
      const spd = Math.round(Math.hypot(v.vx, v.vy) * 1.6);
      // fuel bar when in a vehicle
      const fuel = Math.max(0, Math.min(1, (v.fuel ?? 1)));
      ctx.fillStyle = fuel < 0.2 ? '#e84f4f' : '#cfd8ff';
      ctx.fillText(`${v.brand} ${v.model} — ${spd} km/h`, 20, 110);
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(20, 116, 120, 6);
      ctx.fillStyle = fuel < 0.2 ? '#e84f4f' : '#f0c040';
      ctx.fillRect(20, 116, 120 * fuel, 6);
    }
    ctx.restore();

    // mission objective (top-center)
    const m = g.missions.current;
    if (m) {
      ctx.save();
      ctx.font = 'bold 17px "Segoe UI", Arial';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      const label = `${m.name}: ${m.desc}`;
      const tw = ctx.measureText(label).width;
      ctx.fillRect(w / 2 - tw / 2 - 14, 12, tw + 28, 30);
      ctx.fillStyle = '#ffd23c';
      ctx.fillText(label, w / 2, 33);
      ctx.restore();
    }

    // low-health vignette
    if (g.player.health < 30) {
      const pulse = 0.25 + 0.15 * Math.sin(g.time * 6);
      const grd = ctx.createRadialGradient(w/2, h/2, h*0.3, w/2, h/2, h*0.75);
      grd.addColorStop(0, 'rgba(200,0,0,0)');
      grd.addColorStop(1, `rgba(200,0,0,${pulse})`);
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, w, h);
    }

    // toasts (bottom-center above minimap)
    ctx.save();
    ctx.font = '15px "Segoe UI", Arial';
    ctx.textAlign = 'center';
    let ty = canvas.height - 150;
    for (const t of this.toasts) {
      if (g.time > t.until) continue;
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      const tw = ctx.measureText(t.text).width;
      ctx.fillRect(w / 2 - tw / 2 - 10, ty - 16, tw + 20, 22);
      ctx.fillStyle = '#fff';
      ctx.fillText(t.text, w / 2, ty);
      ty -= 26;
    }
    this.toasts = this.toasts.filter(t => g.time <= t.until);
    ctx.restore();
  }

  drawStateOverlay(ctx, canvas) {
    const g = this.game;
    const w = canvas.width, h = canvas.height;
    ctx.save();
    ctx.fillStyle = 'rgba(10,5,20,0.6)';
    ctx.fillRect(0, 0, w, h);
    ctx.textAlign = 'center';
    if (g.state === 'wasted') {
      ctx.fillStyle = '#e84f4f';
      ctx.font = 'bold 72px Georgia';
      ctx.fillText('WASTED', w / 2, h / 2);
    } else if (g.state === 'busted') {
      ctx.fillStyle = '#6fb0e8';
      ctx.font = 'bold 72px Georgia';
      ctx.fillText('BUSTED', w / 2, h / 2);
    } else if (g.state === 'paused') {
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 48px Georgia';
      ctx.fillText('PAUSED', w / 2, h / 2);
      ctx.font = '18px "Segoe UI"';
      ctx.fillStyle = '#cfd8ff';
      ctx.fillText('Press ESC to resume', w / 2, h / 2 + 40);
    }
    ctx.restore();
  }
}
