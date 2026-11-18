// Solaris City — input.js (final authoring pass)
// Keyboard + mouse state with one-shot action consumption.
// WASD/arrows move, SHIFT sprints, SPACE handbrakes, E enters/exits cars,
// F or left-click fires, TAB toggles the big map, P pauses.

// Keys captured before the browser can scroll or focus-jump away from the game.
const PREVENT_DEFAULT_KEYS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Tab'];

export class Input {
  constructor(game) {
    this.game = game;
    this.keys = new Set();
    this.mouse = { x: innerWidth / 2, y: innerHeight / 2, down: false };
    // One-shot latches, cleared when the game consumes them.
    this._enterExit = false;
    this._fire = false;
    this._mapToggle = false;
    this._pauseToggle = false;
    this.bind();
  }

  bind() {
    addEventListener('keydown', (e) => {
      if (PREVENT_DEFAULT_KEYS.includes(e.key)) e.preventDefault();
      const key = e.key.toLowerCase();
      this.keys.add(key);
      if (key === 'e') this._enterExit = true;
      if (key === 'f') this._fire = true;
      if (e.key === 'Tab') this._mapToggle = true;
      if (key === 'p') this._pauseToggle = true;
    });
    addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
    addEventListener('mousemove', (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
    });
    addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        this.mouse.down = true;
        this._fire = true;
      }
    });
    addEventListener('mouseup', (e) => {
      if (e.button === 0) this.mouse.down = false;
    });
    // Release everything on blur so sprint/driving never stick when tabbing away.
    addEventListener('blur', () => {
      this.keys.clear();
      this.mouse.down = false;
    });
    addEventListener('contextmenu', (e) => e.preventDefault());
  }

  // Normalized movement axes from WASD or the arrow keys.
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

  // One-shot getters: return true once, then reset until the key is pressed again.
  consumeEnterExit() { const v = this._enterExit; this._enterExit = false; return v; }
  consumeFire() { const v = this._fire; this._fire = false; return v; }
  consumeMapToggle() { const v = this._mapToggle; this._mapToggle = false; return v; }
  consumePauseToggle() { const v = this._pauseToggle; this._pauseToggle = false; return v; }
}
