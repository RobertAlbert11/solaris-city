// Authored by Solaris City agent (gta6-01)
// world.js — the city of Solaris City: road grid, blocks, buildings, beach, park, props and static collision.
export const TILE = 40;                 // world units per tile
export const GRID_W = 120, GRID_H = 120; // 4800 x 4800 world
export const WORLD_W = TILE * GRID_W, WORLD_H = TILE * GRID_H;

export const DISTRICTS = [
  { name: 'Solana Beach', x: 0, y: 0, w: 24, h: 120, tint: '#c9b27f' },
  { name: 'Marina Row', x: 24, y: 70, w: 30, h: 50, tint: '#9fb8c9' },
  { name: 'Downtown Solaris', x: 54, y: 40, w: 34, h: 40, tint: '#b9a6d9' },
  { name: 'Palm Heights', x: 24, y: 0, w: 60, h: 40, tint: '#a8d0a8' },
  { name: 'Mariposa Ward', x: 88, y: 60, w: 32, h: 60, tint: '#d9a6a6' },
  { name: 'Industrial Flats', x: 24, y: 40, w: 30, h: 30, tint: '#b8b09a' },
  { name: 'Sunset Cove', x: 88, y: 0, w: 32, h: 60, tint: '#e8c07a' },
];

function districtAt(gx, gy) {
  for (const d of DISTRICTS) if (gx >= d.x && gx < d.x + d.w && gy >= d.y && gy < d.y + d.h) return d;
  return null;
}

const NEON_WORDS = ['SOLARIS', 'HOTEL', 'CLUB VOLT', 'DINER', 'CASINO', 'NOODLE BAR', 'CINEMA', 'PALMS', 'LIQUOR', 'MOTEL'];
const NEON_COLORS = ['#ff3bd4', '#3bfff2', '#fffb3b', '#7cff3b', '#ff7a3b', '#c43bff'];

export function districtNameAt(x, y) {
  const d = districtAt(Math.floor(x / TILE), Math.floor(y / TILE));
  return d ? d.name : 'Solaris City';
}

export class World {
  constructor(game) {
    this.game = game;
    this.buildings = [];   // {x,y,w,h,h3,color,windows,roof}
    this.props = [];       // palm trees, streetlights, benches, hydrants
    this.markers = [];     // mission pins etc (live, set by missions)
    this.colliders = [];   // rectangles: buildings + walls
    this.generate();
  }

  generate() {
    // Road grid every 8 tiles (320u). Blocks fill between roads with buildings around a green courtyard.
    for (let bx = 0; bx < GRID_W - 7; bx += 8) {
      for (let by = 0; by < GRID_H - 7; by += 8) {
        const d = districtAt(bx + 4, by + 4);
        if (d && (d.name === 'Solana Beach' && by % 24 === 0)) continue; // beach gaps
        this.generateBlock(bx, by, d);
      }
    }
    this.generateProps();
  }

  generateBlock(bx, by, d) {
    const x0 = bx * TILE, y0 = by * TILE;
    const base = d ? d.tint : '#b9b0a0';
    // 4-8 buildings per block
    const n = 4 + ((bx * 7 + by * 13) % 4);
    for (let i = 0; i < n; i++) {
      const px = x0 + 20 + (i % 2) * 90 + (i > 3 ? 150 : 0);
      const py = y0 + 20 + Math.floor(i / 2) * 90;
      const w = 60 + ((bx + i * 31) % 3) * 25;
      const h = 60 + ((by + i * 17) % 3) * 25;
      if (px + w > x0 + 240 || py + h > y0 + 240) continue;
      // vary height: downtown is skyscraper country, elsewhere low/mid-rise with occasional towers
      let tall = d && d.name === 'Downtown Solaris' ? 3 + (i % 3) : 1 + (i % 2);
      if (Math.random() < 0.15) tall += 2;
      // vary color: per-building hue jitter away from the district tint
      const c = parseInt(base.slice(1), 16);
      const jr = ((bx * 31 + by * 17 + i * 53) % 60) - 30;
      const jg = ((bx * 13 + by * 29 + i * 71) % 50) - 25;
      const jb = ((bx * 7 + by * 37 + i * 91) % 60) - 30;
      const varied = `rgb(${Math.max(0, Math.min(255, (c >> 16) + jr))},${Math.max(0, Math.min(255, ((c >> 8) & 255) + jg))},${Math.max(0, Math.min(255, (c & 255) + jb))})`;
      const shade = (k) => {
        const r = Math.min(255, (c >> 16) + k), g = Math.min(255, ((c >> 8) & 255) + k), b = Math.min(255, (c & 255) + k);
        return `rgb(${r},${g},${b})`;
      };
      const b = { x: px, y: py, w, h, h3: tall, color: varied, windows: true, roof: shade(20), neon: null };
      if (tall >= 3) b.neon = { text: NEON_WORDS[(Math.random() * NEON_WORDS.length) | 0], color: NEON_COLORS[(Math.random() * NEON_COLORS.length) | 0] };
      this.buildings.push(b);
      this.colliders.push({ x: px, y: py, w, h, solid: true });
    }
  }

  generateProps() {
    // palms along the beach edge and scattered in blocks; streetlights on road corners
    for (let gx = 0; gx <= GRID_W; gx += 8) {
      for (let gy = 0; gy <= GRID_H; gy += 8) {
        this.props.push({ type: 'light', x: gx * TILE, y: gy * TILE });
      }
    }
    for (let i = 0; i < 900; i++) {
      const gx = (Math.floor(Math.sin(i * 127.1) * 43758) % GRID_W + GRID_W) % GRID_W;
      const gy = (Math.floor(Math.sin(i * 311.7) * 12543) % GRID_H + GRID_H) % GRID_H;
      if (gx % 8 === 0 || gy % 8 === 0) continue; // keep roads clear
      this.props.push({ type: gx % 3 === 0 ? 'palm' : 'tree', x: gx * TILE + 20, y: gy * TILE + 20 });
    }
  }

  isRoad(x, y) {
    const gx = x / TILE, gy = y / TILE;
    const fx = Math.abs(gx - Math.round(gx / 8) * 8), fy = Math.abs(gy - Math.round(gy / 8) * 8);
    return fx < 0.9 || fy < 0.9;
  }

  collideRect(r) {
    for (const c of this.colliders) {
      if (r.x < c.x + c.w && r.x + r.w > c.x && r.y < c.y + c.h && r.y + r.h > c.y) return c;
    }
    return null;
  }

  draw(ctx, cam) {
    const vw = (innerWidth / cam.zoom), vh = (innerHeight / cam.zoom);
    const x0 = cam.x - vw / 2, y0 = cam.y - vh / 2;
    const x1 = x0 + vw, y1 = y0 + vh;
    // ground
    ctx.fillStyle = '#3a3f4a';
    ctx.fillRect(Math.max(0, x0), Math.max(0, y0), Math.min(WORLD_W, x1) - Math.max(0, x0), Math.min(WORLD_H, y1) - Math.max(0, y0));
    // beach strip
    ctx.fillStyle = '#d8c58c';
    ctx.fillRect(0, 0, 8 * TILE, WORLD_H);
    ctx.fillStyle = '#2e7fbf';
    ctx.fillRect(-260, 0, 260, WORLD_H); // ocean west of city
    // roads
    ctx.strokeStyle = '#262a33'; ctx.lineWidth = TILE * 1.8;
    for (let gx = 0; gx <= GRID_W; gx += 8) {
      const px = gx * TILE;
      if (px + 60 < x0 || px - 60 > x1) continue;
      ctx.beginPath(); ctx.moveTo(px, Math.max(0, y0)); ctx.lineTo(px, Math.min(WORLD_H, y1)); ctx.stroke();
    }
    for (let gy = 0; gy <= GRID_H; gy += 8) {
      const py = gy * TILE;
      if (py + 60 < y0 || py - 60 > y1) continue;
      ctx.beginPath(); ctx.moveTo(Math.max(0, x0), py); ctx.lineTo(Math.min(WORLD_W, x1), py); ctx.stroke();
    }
    // lane dashes
    ctx.strokeStyle = '#c9c26a'; ctx.lineWidth = 3; ctx.setLineDash([18, 26]);
    for (let gx = 0; gx <= GRID_W; gx += 8) {
      const px = gx * TILE;
      if (px + 10 < x0 || px - 10 > x1) continue;
      ctx.beginPath(); ctx.moveTo(px, Math.max(0, y0)); ctx.lineTo(px, Math.min(WORLD_H, y1)); ctx.stroke();
    }
    for (let gy = 0; gy <= GRID_H; gy += 8) {
      const py = gy * TILE;
      if (py + 10 < y0 || py - 10 > y1) continue;
      ctx.beginPath(); ctx.moveTo(Math.max(0, x0), py); ctx.lineTo(Math.min(WORLD_W, x1), py); ctx.stroke();
    }
    ctx.setLineDash([]);
    // buildings with sun-side shading
    for (const b of this.buildings) {
      if (b.x + b.w < x0 || b.x > x1 || b.y + b.h < y0 || b.y > y1) continue;
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(b.x + b.h3 * 6, b.y + b.h3 * 6, b.w, b.h); // long sun shadow (light from NW)
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = b.roof;
      ctx.fillRect(b.x, b.y, b.w, Math.min(8, b.h / 4));
      if (b.windows) {
        ctx.fillStyle = 'rgba(255,220,150,0.55)';
        for (let wy = b.y + 10; wy < b.y + b.h - 8; wy += 16) {
          for (let wx = b.x + 8; wx < b.x + b.w - 8; wx += 18) {
            if ((wx * 7 + wy * 13) % 5) ctx.fillRect(wx, wy, 8, 8);
          }
        }
      }
      // neon signs glow only at night
      if (b.neon) {
        const night = this.game.daynight ? this.game.daynight.darkness() : 0;
        if (night > 0.3) {
          const glow = night * (0.75 + Math.sin(performance.now() / 350 + b.x) * 0.25);
          ctx.save();
          ctx.font = 'bold 11px "Segoe UI", Arial';
          const tw = ctx.measureText(b.neon.text).width;
          const sx = b.x + (b.w - tw) / 2;
          ctx.globalAlpha = Math.min(1, glow);
          ctx.fillStyle = b.neon.color;
          ctx.shadowColor = b.neon.color;
          ctx.shadowBlur = 10 * night;
          ctx.fillText(b.neon.text, sx, b.y + 20);
          ctx.restore();
        }
      }
    }
    // props
    for (const p of this.props) {
      if (p.x < x0 - 30 || p.x > x1 + 30 || p.y < y0 - 30 || p.y > y1 + 30) continue;
      if (p.type === 'palm') {
        ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + 12, p.y + 12); ctx.stroke();
        ctx.fillStyle = '#8a6a3a'; ctx.fillRect(p.x - 3, p.y - 3, 6, 6);
        ctx.fillStyle = '#3f8f4f';
        for (let a = 0; a < 6; a++) {
          const ang = a * Math.PI / 3;
          ctx.fillRect(p.x + Math.cos(ang) * 8 - 4, p.y + Math.sin(ang) * 8 - 3, 10, 6);
        }
      } else if (p.type === 'tree') {
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath(); ctx.arc(p.x + 6, p.y + 6, 10, 0, 7); ctx.fill();
        ctx.fillStyle = '#2f7f3f'; ctx.beginPath(); ctx.arc(p.x, p.y, 10, 0, 7); ctx.fill();
      } else {
        ctx.fillStyle = '#555f66'; ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
        ctx.fillStyle = 'rgba(255,235,170,0.8)'; ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, 7); ctx.fill();
      }
    }
    // district signposts handled by HUD; markers drawn by missions via effects layer
    for (const m of this.markers) {
      ctx.fillStyle = m.color || '#ffd23c';
      ctx.beginPath();
      const bob = Math.sin(performance.now() / 300) * 4;
      ctx.moveTo(m.x, m.y - 26 + bob);
      ctx.lineTo(m.x + 12, m.y - 6 + bob); ctx.lineTo(m.x + 4, m.y - 6 + bob);
      ctx.lineTo(m.x + 4, m.y); ctx.lineTo(m.x - 4, m.y); ctx.lineTo(m.x - 4, m.y - 6 + bob); ctx.lineTo(m.x - 12, m.y - 6 + bob);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,210,60,0.25)';
      ctx.beginPath(); ctx.arc(m.x, m.y, 22, 0, 7); ctx.fill();
    }
  }
}
