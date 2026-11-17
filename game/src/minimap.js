// Authored by Solaris City agent (gta6-01)
// minimap.js — bottom-left canvas minimap: roads, player arrow, police dots, mission marker.
import { TILE, GRID_W, GRID_H, WORLD_W, WORLD_H } from './world.js';

const SIZE = 170;        // minimap px
const SPAN = 1400;       // world units shown across the minimap

export class Minimap {
  constructor(game) {
    this.game = game;
    this.offscreen = document.createElement('canvas');
    this.offscreen.width = SIZE; this.offscreen.height = SIZE;
  }

  draw(ctx, canvas) {
    const g = this.game;
    const ox = 16, oy = canvas.height - SIZE - 16;
    const c = this.offscreen.getContext('2d');
    const scale = SIZE / SPAN;

    c.fillStyle = '#141821';
    c.fillRect(0, 0, SIZE, SIZE);

    // roads around the player
    const px = g.player.x, py = g.player.y;
    c.strokeStyle = '#3d4452'; c.lineWidth = Math.max(2, TILE * 1.4 * scale);
    for (let gx = 0; gx <= GRID_W; gx += 8) {
      const wx = gx * TILE;
      const sx = (wx - px) * scale + SIZE / 2;
      if (sx < -20 || sx > SIZE + 20) continue;
      c.beginPath(); c.moveTo(sx, 0); c.lineTo(sx, SIZE); c.stroke();
    }
    for (let gy = 0; gy <= GRID_H; gy += 8) {
      const wy = gy * TILE;
      const sy = (wy - py) * scale + SIZE / 2;
      if (sy < -20 || sy > SIZE + 20) continue;
      c.beginPath(); c.moveTo(0, sy); c.lineTo(SIZE, sy); c.stroke();
    }

    // mission marker
    const m = g.missions.current;
    if (m && m.tx !== undefined) {
      const sx = (m.tx - px) * scale + SIZE / 2, sy = (m.ti - py) * scale + SIZE / 2;
      c.fillStyle = '#ffd23c';
      c.beginPath(); c.arc(clamp(sx), clamp(sy), 4, 0, 7); c.fill();
    }

    // activity stash dots (green)
    for (const s of g.activities.stashes) {
      if (s.taken) continue;
      const sx = (s.x - px) * scale + SIZE / 2, sy = (s.y - py) * scale + SIZE / 2;
      if (sx < 0 || sx > SIZE || sy < 0 || sy > SIZE) continue;
      c.fillStyle = '#4fc96f';
      c.beginPath(); c.arc(sx, sy, 3, 0, 7); c.fill();
    }

    // police dots
    for (const cop of g.police.cars) {
      if (cop.driver === 'player') continue;
      const sx = (cop.x - px) * scale + SIZE / 2, sy = (cop.y - py) * scale + SIZE / 2;
      // clamp edge blips so offscreen cops are still visible as wanted-level hints
      if (sx < 0 || sx > SIZE || sy < 0 || sy > SIZE) {
        if (g.police.level < 2) continue;
        c.fillStyle = 'rgba(75,123,255,0.6)';
        c.beginPath(); c.arc(Math.max(4, Math.min(SIZE - 4, sx)), Math.max(4, Math.min(SIZE - 4, sy)), 3, 0, 7); c.fill();
        continue;
      }
      c.fillStyle = '#4b7bff';
      c.beginPath(); c.arc(sx, sy, 3.5, 0, 7); c.fill();
    }

    // traffic (faint)
    c.fillStyle = 'rgba(200,200,200,0.5)';
    for (const v of g.traffic.vehicles) {
      if (v.driver === 'player') continue;
      const sx = (v.x - px) * scale + SIZE / 2, sy = (v.y - py) * scale + SIZE / 2;
      if (sx < 0 || sx > SIZE || sy < 0 || sy > SIZE) continue;
      c.fillRect(sx - 1.5, sy - 1.5, 3, 3);
    }

    // player arrow (center, rotates with heading)
    c.save();
    c.translate(SIZE / 2, SIZE / 2);
    c.rotate(g.player.dir + Math.PI / 2);
    c.fillStyle = '#ffe9a8';
    c.beginPath(); c.moveTo(0, -7); c.lineTo(5, 6); c.lineTo(-5, 6); c.closePath(); c.fill();
    c.restore();

    // border + paste onto main canvas
    ctx.save();
    ctx.globalAlpha = 0.92;
    ctx.drawImage(this.offscreen, ox, oy);
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2;
    ctx.strokeRect(ox, oy, SIZE, SIZE);
    // district name under the map
    ctx.font = '13px "Segoe UI", Arial';
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    const name = g.world.districtNameAt(px, py) ?? 'Solaris City';
    ctx.fillText(name, ox + 4, oy + SIZE + 14);
    ctx.restore();
  }
}

function clamp(v) { return Math.max(4, Math.min(SIZE - 4, v)); }
