// Authored by Solaris City agent (gta6-01)
// activities.js — street racing, spray graffiti, find collectibles for bonus cash & respect.
import { TILE, GRID_W, GRID_H } from './world.js';

const ACTIVITIES = [
  { id: 'racing', name: 'Street Race', reward: 80, respect: 8 },
  { id: 'graffiti', name: 'Tag the Spot', reward: 40, respect: 5 },
  { id: 'collectible', name: 'Stash Find', reward: 60, respect: 6 },
];

// 8 hidden collectible zones spread around the map
const STASHES = Array.from({ length: 8 }, (_, i) => ({
  x: (8 + ((i * 17 + 23) % (GRID_W - 16))) * TILE,
  y: (8 + ((i * 31 + 11) % (GRID_H - 16))) * TILE,
  taken: false,
}));

export class Activities {
  constructor(game) {
    this.game = game;
    this.activities = [...ACTIVITIES];
    this.stashes = STASHES;
    this.nearby = null;
    this.raceTimer = 0;
    this.raceActive = false;
    this.raceStart = null;
    this.raceEnd = null;
  }

  // Show nearby activity prompt when close to a stash
  update(dt) {
    const g = this.game;
    this.nearby = null;
    for (const s of this.stashes) {
      if (s.taken) continue;
      const d = Math.hypot(g.player.x - s.x, g.player.y - s.y);
      if (d < 45) { this.nearby = s; break; }
    }
    // street race: auto-triggered if player enters a road at speed
    if (!this.raceActive) {
      const v = g.player.currentVehicle;
      if (v && Math.hypot(v.vx, v.vy) > 130 && g.world.isRoad(v.x, v.y) && Math.random() < 0.002) {
        this.startRace(v.x, v.y);
      }
    } else {
      this.raceTimer -= dt;
      // win when player reaches the checkpoint
      if (this.raceEnd && Math.hypot(g.player.x - this.raceEnd.x, g.player.y - this.raceEnd.y) < 60) {
        this.endRace(true);
      } else if (this.raceTimer <= 0) this.endRace(false);
    }
  }

  collectNearby() {
    if (this.nearby) {
      this.nearby.taken = true;
      const n = this.stashes.filter(s => s.taken).length;
      const bonus = Math.min(40, n * 5);   // escalating bonus per stash found
      this.game.cash += 60 + bonus; this.game.respect += 6;
      this.game.hud.toast(`Stash found! +$${60 + bonus} Respect +6 (${n}/8)`);
      this.game.audio.pickup();
      return true;
    }
    return false;
  }

  startRace(x, y) {
    this.raceActive = true;
    this.raceTimer = 22;
    const a = Math.random() * Math.PI * 2;
    // clamp checkpoint inside the map so races are always finishable
    const ex = x + Math.cos(a) * 1400, ey = y + Math.sin(a) * 1400;
    this.raceEnd = {
      x: Math.max(2 * TILE, Math.min((GRID_W - 2) * TILE, ex)),
      y: Math.max(2 * TILE, Math.min((GRID_H - 2) * TILE, ey)),
    };
    this.game.hud.toast('Street race! Reach the checkpoint!');
    this.game.world.markers.push({ x: this.raceEnd.x, y: this.raceEnd.y, color: '#4fc96f' });
  }

  endRace(won) {
    if (this.raceActive && won) {
      this.game.cash += 80; this.game.respect += 8;
      this.game.hud.toast('Race won! +$80 Respect +8');
    }
    this.raceActive = false;
    this.game.world.markers = this.game.world.markers.filter(m => m.color !== '#4fc96f');
  }
}
