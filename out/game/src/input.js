// Authored by Solaris City agent (gta6-01)
// input.js — keyboard and mouse state with action mapping (WASD/arrows, SHIFT sprint, E enter car, F fire, SPACE handbrake).
export class Input {
  constructor(game) {
    this.game = game;
    this.keys = new Set();
    this.mouse = { x: innerWidth / 2, y: innerHeight / 2, down: false };
    addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Tab'].includes(e.key)) e.preventDefault();
      this.keys.add(e.key.toLowerCase());
      if (e.key.toLowerCase() === 'e') this._enterExit = true;
      if (e.key.toLowerCase() === 'f') this._fire = true;
      if (e.key === 'Tab') this._mapToggle = true;
      if (e.key.toLowerCase() === 'p') this._pauseToggle = true;
    });
    addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
    addEventListener('mousemove', (e) => { this.mouse.x = e.clientX; this.mouse.y = e.clientY; });
    addEventListener('mousedown', (e) => { if (e.button === 0) { this.mouse.down = true; this._fire = true; } });
    addEventListener('mouseup', (e) => { if (e.button === 0) this.mouse.down = false; });
    // release all keys on blur so sprint/drive don't stick when tabbing away
    addEventListener('blur', () => { this.keys.clear(); this.mouse.down = false; });
    addEventListener('contextmenu', (e) => e.preventDefault());
  }
  axis() {
    const k = this.keys;
    let ax = 0, ay = 0;
    if (k.has('w') || k.has('arrowup')) ay -= 1;
    if (k.has('s') || k.has('arrowdown')) ay += 1;
    if (k.has('a') || k.has('arrowleft')) ax -= 1;
    if (k.has('d') || k.has('arrowright')) ax += 1;
    return { ax, ay };
  }
  sprint() { return this.keys.has('shift'); }
  handbrake() { return this.keys.has(' '); }
  consumeEnterExit() { const v = this._enterExit; this._enterExit = false; return v; }
  consumeFire() { const v = this._fire; this._fire = false; return v; }
  consumeMapToggle() { const v = this._mapToggle; this._mapToggle = false; return v; }
  consumePauseToggle() { const v = this._pauseToggle; this._pauseToggle = false; return v; }
}
