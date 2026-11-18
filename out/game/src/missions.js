// Authored by Solaris City agent (gta6-01)
// missions.js — story arc (4 acts, 10+ missions), objectives, success/fail, money & respect rewards.
import { TILE, WORLD_W, WORLD_H } from './world.js';

const MISSIONS = [
  // Act 1: Rise
  { id: 1, name: 'Welcome to Solana', act: 1, desc: "Meet Rico at the pier.",
    objective: 'reach', tx: 3 * TILE + 60, ty: 8 * TILE, dist: 60, reward: 50, respect: 5 },
  { id: 2, name: 'Hot Wheels', act: 1, desc: "Steal the Comet GT from the mall.",
    objective: 'steal', tx: 40 * TILE, ty: 30 * TILE, dist: 80, reward: 120, respect: 10 },
  { id: 3, name: 'Downtown Run', act: 1, desc: "Race to the Marina Row checkpoint.",
    objective: 'race', tx: 30 * TILE, ty: 65 * TILE, dist: 70, reward: 200, respect: 15 },
  // Act 2: Crew
  { id: 4, name: 'The Mariposa Job', act: 2, desc: "Infiltrate the warehouse in Industrial Flats.",
    objective: 'reach', tx: 36 * TILE, ty: 52 * TILE, dist: 60, reward: 350, respect: 25 },
  { id: 5, name: 'Cop Car Chase', act: 2, desc: "Evade 3-star heat to the safehouse.",
    objective: 'escape', tx: 55 * TILE, ty: 55 * TILE, dist: 90, reward: 500, respect: 40 },
  { id: 6, name: 'Armed & Dangerous', act: 2, desc: "Eliminate the competition in Mariposa Ward.",
    objective: 'eliminate', target: 'enemies', count: 5, reward: 600, respect: 50 },
  // Act 3: Power
  { id: 7, name: 'The Big Score', act: 3, desc: "Rob the armored truck on Sunset Cove.",
    objective: 'reach', tx: 92 * TILE, ty: 30 * TILE, dist: 75, reward: 900, respect: 70 },
  { id: 8, name: 'Police Siege', act: 3, desc: "Survive a 5-star assault at Palm Heights.",
    objective: 'survive', timer: 30, reward: 800, respect: 60 },
  { id: 9, name: 'Ghost Protocol', act: 3, desc: "Complete a no-heat run through Downtown.",
    objective: 'noheat', tx: 70 * TILE, ty: 60 * TILE, dist: 80, reward: 1000, respect: 80 },
  // Act 4: Legend
  { id: 10, name: 'Boulevard Legend', act: 4, desc: "Return to the pier — the city is yours.",
    objective: 'reach', tx: 2 * TILE + 40, ty: 110 * TILE, dist: 90, reward: 2000, respect: 150 },
];

export class Missions {
  constructor(game) {
    this.game = game;
    this.active = false;
    this.current = null;
    this.completed = new Set();
    this.failed = false;
    this.timer = 0;
    this.eliminateCount = 0;
    this.eliminateNeeded = 0;
    this.offers = [];
    this.offerIndex = 0;
    // side hustles: taxi fares & timed deliveries (repeatable, independent of story)
    this.side = null;          // {type:'taxi'|'delivery', ...}
    this.sideCooldown = 0;
  }

  // side hustles trigger when the player drives near a taxi stand / cargo depot
  tryStartSide() {
    const g = this.game;
    const v = g.player.currentVehicle;
    if (!v) return;
    this.sideCooldown -= 1;
    if (this.side || this.sideCooldown > 0) return;
    const px = g.player.x, py = g.player.y;
    const speed = Math.hypot(v.vx, v.vy);
    if (speed > 45 && speed < 90 && g.world.isRoad(px, py) && Math.random() < 0.02) {
      const taxi = v.color === '#c9b74f' && Math.random() < 0.5;
      const dest = this.randomRoadPoint();
      if (taxi) {
        this.side = { type: 'taxi', tx: dest.x, ty: dest.y, fare: 60 + ((Math.random() * 90) | 0) };
        g.hud.toast(`TAXI FARE — take the passenger to the fare pin ($${this.side.fare})`);
      } else {
        this.side = { type: 'delivery', tx: dest.x, ty: dest.y, limit: 40 + Math.random() * 30, elapsed: 0 };
        g.hud.toast(`TIMED DELIVERY — get the package there in ${Math.round(this.side.limit)}s!`);
      }
      g.world.markers.push({ x: dest.x, y: dest.y, color: '#3bd4ff' });
      g.audio.blip(880, 0.1);
    }
  }

  randomRoadPoint() {
    const g = this.game;
    for (let t = 0; t < 24; t++) {
      const x = (Math.random() * (WORLD_W - 320)) | 0, y = (Math.random() * (WORLD_H - 320)) | 0;
      if (g.world.isRoad(x + 160, y + 160)) return { x: x + 160, y: y + 160 };
    }
    return { x: WORLD_W / 2, y: WORLD_H / 2 };
  }

  updateSide(dt) {
    const g = this.game, s = this.side;
    if (!s) return;
    const v = g.player.currentVehicle;
    const d = Math.hypot(g.player.x - s.tx, g.player.y - s.ty);
    if (s.type === 'delivery') {
      s.elapsed += dt;
      if (s.elapsed > s.limit) { this.endSide('Delivery late — package spoiled'); return; }
      if (v && d < 60 && Math.hypot(v.vx, v.vy) < 60) {
        g.cash += 150; g.respect += 8; g.score += 150;
        g.hud.toast(`Delivered on time! +$150 Respect +8`);
        this.endSide(null);
      }
    } else {
      if (v && d < 60 && Math.hypot(v.vx, v.vy) < 60) {
        g.cash += s.fare; g.respect += 4; g.score += s.fare;
        g.hud.toast(`Fare paid! +$${s.fare} Respect +4`);
        this.endSide(null);
      }
    }
  }

  endSide(msg) {
    const g = this.game;
    if (msg) g.hud.toast(msg);
    g.world.markers = g.world.markers.filter(mk => mk.color !== '#3bd4ff');
    this.side = null;
    this.sideCooldown = 20;
  }

  offerNext() {
    const g = this.game;
    const next = MISSIONS.find(m => !this.completed.has(m.id) && !this.failed);
    if (!next) return;
    this.offers = [next];
    this.offerIndex = 0;
    this.failed = false;
    g.hud.toast(`Mission: ${next.name} — ${next.desc}`);
    this.active = true;
    // show objective marker
    if (next.ty !== undefined) g.world.markers.push({ x: next.tx, y: next.ty, color: '#ffd23c' });
  }

  startMission(mission) {
    const g = this.game;
    this.current = mission;
    this.failed = false;
    this.timer = 0;
    this.eliminateCount = 0;
    this.eliminateNeeded = mission.count ?? 0;
    g.world.markers = g.world.markers.filter(mk => mk.color !== '#ffd23c');
    if (mission.ty !== undefined) g.world.markers.push({ x: mission.tx, y: mission.ty, color: '#ffd23c' });
    g.hud.toast(`Objective: ${mission.desc}`);
  }

  update(dt) {
    const g = this.game, m = this.current;
    this.tryStartSide();
    this.updateSide(dt);
    if (!m || this.completed.has(m.id)) return;
    this.timer += dt;

    if (m.objective === 'reach' || m.objective === 'race') {
      const d = Math.hypot(g.player.x - m.tx, g.player.y - m.ty);
      if (d < m.dist) this.succeed();
    } else if (m.objective === 'steal') {
      if (g.player.currentVehicle) {
        const d = Math.hypot(g.player.x - m.tx, g.player.y - m.ty);
        if (d < m.dist) this.succeed();
      }
    } else if (m.objective === 'escape') {
      if (g.police.level === 0) this.succeed();
      if (this.timer > 120) this.fail('Too slow');
    } else if (m.objective === 'eliminate') {
      // enemies counted by combat.js via game.missions.eliminateCount++
      if (this.eliminateCount >= this.eliminateNeeded) this.succeed();
    } else if (m.objective === 'survive') {
      if (this.timer >= m.timer) this.succeed();
    } else if (m.objective === 'noheat') {
      if (g.police.level > 0) this.fail('Heat spotted');
      const d = Math.hypot(g.player.x - m.tx, g.player.y - m.ty);
      if (d < m.dist) this.succeed();
    }

    // fail on death/bust
    if (g.state === 'busted' || g.state === 'wasted') this.fail('Mission failed');
    // side hustles also abort on bust/waste
    if (this.side && (g.state === 'busted' || g.state === 'wasted')) this.endSide('Hustle abandoned');
  }

  succeed() {
    const g = this.game, m = this.current;
    g.cash += m.reward;
    g.respect += m.respect;
    g.score += m.reward;
    g.world.markers = g.world.markers.filter(mk => mk.color !== '#ffd23c');
    g.hud.toast(`$${m.reward} earned! Respect +${m.respect}`);
    this.completed.add(m.id);
    this.current = null;
    if (this.completed.size < MISSIONS.length) {
      setTimeout(() => this.offerNext(), 3000);
    } else {
      g.hud.toast('All missions complete — you are a Boulevard Legend');
    }
  }

  fail(reason) {
    const g = this.game;
    g.world.markers = g.world.markers.filter(mk => mk.color !== '#ffd23c');
    g.hud.toast('Mission Failed: ' + reason);
    this.current = null;
    this.failed = true;
    setTimeout(() => this.offerNext(), 4000);
  }
}
