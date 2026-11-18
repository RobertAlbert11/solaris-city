// cheats.js — typed cheat codes: health, clear wanted, teleport
const CHEATS = {
  HESOYAM: (game) => { // full health + armor
    const p = game.player;
    p.health = 100;
    p.armor = 100;
    return 'health restored';
  },
  AEZAKMI: (game) => { // clear wanted level
    game.police.clear();
    return 'wanted cleared';
  },
  TPHERE: (game) => { // teleport to world spawn / marker
    const t = game.marker || { x: game.world ? game.world.spawnX : 0, y: game.world ? game.world.spawnY : 0 };
    const p = game.player;
    p.x = t.x;
    p.y = t.y;
    p.currentVehicle = null;
    return `teleported to ${t.x | 0}, ${t.y | 0}`;
  },
};

export class CheatSystem {
  constructor(game, onNotify = (m) => game.hud.toast(m)) {
    this.game = game;
    this.onNotify = onNotify;
    this.buffer = '';
    this.resetIn = 0;
  }

  handleKey(key) {
    if (typeof key !== 'string' || key.length !== 1) return;
    this.buffer = (this.buffer + key.toUpperCase()).slice(-16);
    this.resetIn = 3; // seconds before buffer expires
    for (const code of Object.keys(CHEATS)) {
      if (this.buffer.endsWith(code)) {
        const msg = CHEATS[code](this.game);
        this.buffer = '';
        this.onNotify(`CHEAT: ${msg}`);
        return;
      }
    }
  }

  update(dt) {
    if (this.resetIn > 0 && (this.resetIn -= dt) <= 0) this.buffer = '';
  }
}
