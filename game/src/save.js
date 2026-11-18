// Solaris City — save.js (rewritten polish pass)
// localStorage autosave every 5 s during play, plus a beforeunload flush
// so tabs closed accidentally still keep progress.

const KEY = 'solaris-city-save-v1';
// Seconds between autosaves.
const AUTOSAVE_INTERVAL = 5;

export class Save {
  constructor(game) {
    this.game = game;
    this.loaded = false;
    this.lastSave = 0;
    addEventListener('beforeunload', () => {
      if (game.state !== 'menu') this.save();
    });
  }

  load() {
    try {
      const raw = localStorage.getItem(KEY);
      this.data = raw ? JSON.parse(raw) : null;
      this.loaded = !!this.data;
    } catch (e) {
      this.data = null;
    }
    return this.loaded;
  }

  restoreProgress() {
    const g = this.game;
    const d = this.data;
    if (!d) return;
    g.cash = d.cash ?? 250;
    g.respect = d.respect ?? 0;
    g.score = d.score ?? 0;
    g.player.deaths = d.deaths ?? 0;
    g.player.busts = d.busts ?? 0;
    g.time = d.playTime ?? 0;
    this.lastSave = g.time;
    if (d.completed) {
      for (const id of d.completed) g.missions.completed.add(id);
    }
    g.hud.toast('Progress restored');
  }

  // Called every frame; only actually writes if enough time has passed.
  autosave() {
    const g = this.game;
    if (g.time - this.lastSave < AUTOSAVE_INTERVAL) return;
    this.lastSave = g.time;
    this.save();
  }

  save() {
    const g = this.game;
    try {
      localStorage.setItem(KEY, JSON.stringify({
        cash: g.cash,
        respect: g.respect,
        score: g.score,
        deaths: g.player.deaths,
        busts: g.player.busts,
        completed: [...g.missions.completed],
        playTime: g.time,
      }));
    } catch (e) {
      // Storage may be blocked in private mode — gracefully ignore.
    }
  }
}
