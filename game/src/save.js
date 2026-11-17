// Authored by Solaris City agent (gta6-01)
// save.js — localStorage autosave of cash, respect, score, completed missions and stats.
const KEY = 'solaris-city-save-v1';

export class Save {
  constructor(game) {
    this.game = game;
    this.loaded = false;
    this.lastSave = 0;
    // flush a final save when the tab closes so progress isn't lost
    addEventListener('beforeunload', () => { if (game.state !== 'menu') this.save(); });
  }

  load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) { this.data = JSON.parse(raw); this.loaded = true; }
      else this.data = null;
    } catch (e) { this.data = null; }
    return this.loaded;
  }

  restoreProgress() {
    const g = this.game, d = this.data;
    if (!d) return;
    g.cash = d.cash ?? 250;
    g.respect = d.respect ?? 0;
    g.score = d.score ?? 0;
    g.player.deaths = d.deaths ?? 0;
    g.player.busts = d.busts ?? 0;
    g.time = d.playTime ?? 0;
    this.lastSave = g.time;
    if (d.completed) for (const id of d.completed) g.missions.completed.add(id);
    g.hud.toast('Progress restored');
  }

  autosave() {
    const g = this.game;
    if (g.time - this.lastSave < 5) return;
    this.lastSave = g.time;
    this.save();
  }

  save() {
    const g = this.game;
    try {
      localStorage.setItem(KEY, JSON.stringify({
        cash: g.cash, respect: g.respect, score: g.score,
        deaths: g.player.deaths, busts: g.player.busts,
        completed: [...g.missions.completed],
        playTime: g.time,
      }));
    } catch (e) { /* storage may be unavailable */ }
  }
}
