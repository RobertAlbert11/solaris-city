// Solaris City — activities.js (final authoring pass)
// Side activities: stash hunting, spontaneous street races.
// Races start by chance when the player blasts down a road at speed.

import { TILE, GRID_W, GRID_H } from './world.js';

// How fast you must be going before a race can trigger (u/s).
const RACE_TRIGGER_SPEED = 130;
// Per-update chance of a race starting while conditions are met.
const RACE_TRIGGER_CHANCE = 0.002;
// Seconds on the clock to reach the checkpoint.
const RACE_TIME_LIMIT = 22;
// Distance from checkpoint (u) that counts as "crossed the line".
const RACE_FINISH_RADIUS = 60;
// Pickup radius for stashes (u).
const STASH_RADIUS = 45;

const STASH_COUNT = 8;
const STASH_BASE_CASH = 60;
const STASH_BONUS_STEP = 5;
const STASH_BONUS_CAP = 40;
const STASH_RESPECT = 6;

const RACE_CASH = 80;
const RACE_RESPECT = 8;
const RACE_MARKER_COLOR = '#4fc96f';

// 8 hidden stashes scattered across the grid via a deterministic spread.
// The (i * prime + offset) % range pattern avoids clustering without a RNG seed.
function makeStashes() {
  return Array.from({ length: STASH_COUNT }, (_, i) => ({
    x: (8 + ((i * 17 + 23) % (GRID_W - 16))) * TILE,
    y: (8 + ((i * 31 + 11) % (GRID_H - 16))) * TILE,
    taken: false,
  }));
}

export class Activities {
  constructor(game) {
    this.game = game;
    this.stashes = makeStashes();
    this.nearby = null;       // stash currently in pickup range, if any
    this.raceActive = false;
    this.raceTimer = 0;
    this.raceEnd = null;
  }

  update(dt) {
    this.updateNearbyStash();
    this.updateRace(dt);
  }

  // Nearest untaken stash within pickup range.
  updateNearbyStash() {
    const p = this.game.player;
    this.nearby = null;
    for (const s of this.stashes) {
      if (s.taken) continue;
      if (Math.hypot(p.x - s.x, p.y - s.y) < STASH_RADIUS) {
        this.nearby = s;
        break;
      }
    }
  }

  // Racing: chance-triggered on roads at speed; win by reaching the pin.
  updateRace(dt) {
    const g = this.game;
    const v = g.player.currentVehicle;
    if (!this.raceActive) {
      if (v && Math.hypot(v.vx, v.vy) > RACE_TRIGGER_SPEED && g.world.isRoad(v.x, v.y)
          && Math.random() < RACE_TRIGGER_CHANCE) {
        this.startRace(v.x, v.y);
      }
      return;
    }
    this.raceTimer -= dt;
    if (this.raceEnd
        && Math.hypot(g.player.x - this.raceEnd.x, g.player.y - this.raceEnd.y) < RACE_FINISH_RADIUS) {
      this.endRace(true);
    } else if (this.raceTimer <= 0) {
      this.endRace(false);
    }
  }

  collectNearby() {
    const s = this.nearby;
    if (!s) return false;
    s.taken = true;
    this.nearby = null;
    const found = this.stashes.filter(st => st.taken).length;
    // Later stashes pay progressively more, capped so total payouts stay bounded.
    const bonus = Math.min(STASH_BONUS_CAP, found * STASH_BONUS_STEP);
    const payout = STASH_BASE_CASH + bonus;
    this.game.cash += payout;
    this.game.respect += STASH_RESPECT;
    this.game.hud.toast(`Stash found! +$${payout} Respect +${STASH_RESPECT} (${found}/${STASH_COUNT})`);
    this.game.audio.pickup();
    return true;
  }

  startRace(x, y) {
    this.raceActive = true;
    this.raceTimer = RACE_TIME_LIMIT;
    // Checkpoint sits 1400u out in a random direction, clamped inside the map.
    const a = Math.random() * Math.PI * 2;
    const ex = x + Math.cos(a) * 1400;
    const ey = y + Math.sin(a) * 1400;
    this.raceEnd = {
      x: Math.max(2 * TILE, Math.min((GRID_W - 2) * TILE, ex)),
      y: Math.max(2 * TILE, Math.min((GRID_H - 2) * TILE, ey)),
    };
    this.game.hud.toast('Street race! Reach the checkpoint!');
    this.game.world.markers.push({ x: this.raceEnd.x, y: this.raceEnd.y, color: RACE_MARKER_COLOR });
  }

  endRace(won) {
    if (this.raceActive && won) {
      this.game.cash += RACE_CASH;
      this.game.respect += RACE_RESPECT;
      this.game.hud.toast(`Race won! +$${RACE_CASH} Respect +${RACE_RESPECT}`);
    }
    this.raceActive = false;
    // Sweep only this activity's marker so mission pins are left untouched.
    this.game.world.markers = this.game.world.markers.filter(m => m.color !== RACE_MARKER_COLOR);
  }
}
