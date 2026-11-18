// Solaris City — minimap.js (final authoring pass)
// Bottom-left radar: roads, mission pin, stash dots, police blips, traffic,
// rotating player arrow and the current district name.

import { TILE, GRID_W, WORLD_W, WORLD_H } from './world.js';

const SIZE = 170;      // minimap px
const SPAN = 1400;     // world units visible across the minimap
const EDGE_MARGIN = 4; // px inset for clamped edge blips
const GRID_STEP = 8;   // world grid roads every 8 tiles

function clampBlip(v) {
  return Math.max(EDGE_MARGIN, Math.min(SIZE - EDGE_MARGIN, v));
}

export class Minimap {
  constructor(game) {
    this.game = game;
    // Offscreen canvas prevents per-frame full minimap redraws; only the
    // per-frame blips are composited directly onto the main canvas.
    this.offscreen = document.createElement('canvas');
    this.offscreen.width = SIZE;
    this.offscreen.height = SIZE;
  }

  draw(ctx, canvas) {
    const g = this.game;
    const ox = 16;
    const oy = canvas.height - SIZE - 16;
    const c = this.offscreen.getContext('2d');
    const scale = SIZE / SPAN;
    const px = g.player.x, py = g.player.y;

    this.drawBackground(c);
    this.drawRoads(c, scale, px, py);
    this.drawMissionPin(c, scale, px, py);
    this.drawStashes(c, scale, px, py);
    this.drawPolice(c, scale, px, py);
    this.drawTraffic(c, scale, px, py);
    this.drawPlayerArrow(c, g.player.dir);

    // Paste onto the main canvas with a border and district label.
    ctx.save();
    ctx.globalAlpha = 0.92;
    ctx.drawImage(this.offscreen, ox, oy);
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 2;
    ctx.strokeRect(ox, oy, SIZE, SIZE);
    ctx.font = '13px "Segoe UI", Arial';
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    const name = g.world.districtNameAt(px, py) ?? 'Solaris City';
    ctx.fillText(name, ox + 4, oy + SIZE + 14);
    ctx.restore();
  }

  drawBackground(c) {
    c.fillStyle = '#141821';
    c.fillRect(0, 0, SIZE, SIZE);
  }

  drawRoads(c, scale, px, py) {
    c.strokeStyle = '#3d4452';
    c.lineWidth = Math.max(2, TILE * 1.4 * scale);
    for (let gx = 0; gx <= GRID_W; gx += GRID_STEP) {
      const sx = (gx * TILE - px) * scale + SIZE / 2;
      if (sx < -20 || sx > SIZE + 20) continue;
      c.beginPath();
      c.moveTo(sx, 0);
      c.lineTo(sx, SIZE);
      c.stroke();
    }
    for (let gy = 0; gy <= GRID_H; gy += GRID_STEP) {
      const sy = (gy * TILE - py) * scale + SIZE / 2;
      if (sy < -20 || sy > SIZE + 20) continue;
      c.beginPath();
      c.moveTo(0, sy);
      c.lineTo(SIZE, sy);
      c.stroke();
    }
  }

  drawMissionPin(c, scale, px, py) {
    const m = this.game.missions.current;
    if (!m || m.tx === undefined) return;
    const sx = (m.tx - px) * scale + SIZE / 2;
    const sy = (m.ti - py) * scale + SIZE / 2;
    c.fillStyle = '#ffd23c';
    c.beginPath();
    c.arc(clampBlip(sx), clampBlip(sy), 4, 0, 7);
    c.fill();
  }

  drawStashes(c, scale, px, py) {
    for (const s of this.game.activities.stashes) {
      if (s.taken) continue;
      const sx = (s.x - px) * scale + SIZE / 2;
      const sy = (s.y - py) * scale + SIZE / 2;
      if (sx < 0 || sx > SIZE || sy < 0 || sy > SIZE) continue;
      c.fillStyle = '#4fc96f';
      c.beginPath();
      c.arc(sx, sy, 3, 0, 7);
      c.fill();
    }
  }

  drawPolice(c, scale, px, py) {
    const g = this.game;
    for (const cop of g.police.cars) {
      if (cop.driver === 'player') continue;
      const sx = (cop.x - px) * scale + SIZE / 2;
      const sy = (cop.y - py) * scale + SIZE / 2;
      const onMap = sx >= 0 && sx <= SIZE && sy >= 0 && sy <= SIZE;
      if (onMap) {
        c.fillStyle = '#4b7bff';
        c.beginPath();
        c.arc(sx, sy, 3.5, 0, 7);
        c.fill();
      } else if (g.police.level >= 2) {
        // Offscreen cops pinned to the edge as a wanted-level hint.
        c.fillStyle = 'rgba(75,123,255,0.6)';
        c.beginPath();
        c.arc(clampBlip(sx), clampBlip(sy), 3, 0, 7);
        c.fill();
      }
    }
  }

  drawTraffic(c, scale, px, py) {
    c.fillStyle = 'rgba(200,200,200,0.5)';
    for (const v of this.game.traffic.vehicles) {
      if (v.driver === 'player') continue;
      const sx = (v.x - px) * scale + SIZE / 2;
      const sy = (v.y - py) * scale + SIZE / 2;
      if (sx < 0 || sx > SIZE || sy < 0 || sy > SIZE) continue;
      c.fillRect(sx - 1.5, sy - 1.5, 3, 3);
    }
  }

  drawPlayerArrow(c, dir) {
    c.save();
    c.translate(SIZE / 2, SIZE / 2);
    c.rotate(dir + Math.PI / 2);
    c.fillStyle = '#ffe9a8';
    c.beginPath();
    c.moveTo(0, -7);
    c.lineTo(5, 6);
    c.lineTo(-5, 6);
    c.closePath();
    c.fill();
    c.restore();
  }
}
