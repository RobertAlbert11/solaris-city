// Solaris City — main.js (rewritten polish pass)
// Game boot: wires every subsystem together, runs the fixed-timestep-capped
// main loop and layers the render passes (world -> entities -> sky -> HUD).

import { Input } from './input.js';
import { World } from './world.js';
import { Player } from './player.js';
import { Camera } from './camera.js';
import { Traffic } from './traffic.js';
import { Police } from './police.js';
import { Missions } from './missions.js';
import { Hud } from './hud.js';
import { Minimap } from './minimap.js';
import { Effects } from './effects.js';
import { Audio } from './audio.js';
import { Save } from './save.js';
import { NightSky } from './nightsky.js';
import { DayNight } from './daynight.js';
import { Activities } from './activities.js';
import { Combat } from './combat.js';

// Clamp dt so a backgrounded tab can't produce a giant simulation jump on return.
const MAX_FRAME_SECONDS = 0.05;
// Starting wallet when no save exists.
const STARTING_CASH = 250;

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const ui = {
  menu: document.getElementById('menu'),
  play: document.getElementById('playBtn'),
  resume: document.getElementById('resumeBtn'),
};

function resize() {
  canvas.width = innerWidth;
  canvas.height = innerHeight;
}
addEventListener('resize', resize);
resize();

// Central game object shared by every subsystem.
export const game = {
  state: 'menu',   // menu | playing | paused | busted | wasted
  time: 0,
  score: 0,
  cash: STARTING_CASH,
  respect: 0,
  world: null, player: null, camera: null, input: null,
  traffic: null, police: null, missions: null, hud: null, minimap: null,
  effects: null, audio: null, save: null, daynight: null, activities: null, combat: null,
};

// Subsystem construction order matters: world first (others query it),
// save last so it can read/restore everything above it.
game.world = new World(game);
game.input = new Input(game);
game.player = new Player(game);
game.camera = new Camera(game, canvas);
game.traffic = new Traffic(game);
game.police = new Police(game);
game.missions = new Missions(game);
game.hud = new Hud(game);
game.minimap = new Minimap(game);
game.effects = new Effects(game);
game.audio = new Audio(game);
game.daynight = new DayNight(game);
game.activities = new Activities(game);
game.combat = new Combat(game);
new NightSky(game); // registers sky renderer hooks on world

game.save = new Save(game);
game.save.load();

// --- Menu / pause flow -------------------------------------------------------

ui.play.onclick = () => {
  game.audio.start();
  startGame();
};
ui.resume.onclick = () => {
  game.state = 'playing';
  ui.menu.classList.add('hidden');
};

addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (game.state === 'playing') pause();
    else if (game.state === 'paused') resume();
  } else if (e.key.toLowerCase() === 'p') {
    if (game.state === 'playing') pause();
    else if (game.state === 'paused') resume();
  }
});

function pause() {
  game.state = 'paused';
  ui.resume.classList.remove('hidden');
  showMenu();
}

function resume() {
  game.state = 'playing';
  ui.menu.classList.add('hidden');
}

function showMenu() {
  ui.menu.classList.remove('hidden');
  ui.play.textContent = game.save.loaded ? 'CONTINUE' : 'START GAME';
}

function startGame() {
  if (game.state === 'menu') game.save.restoreProgress();
  ui.menu.classList.add('hidden');
  game.state = 'playing';
  if (!game.missions.active) game.missions.offerNext();
}

// --- Main loop ---------------------------------------------------------------

let last = performance.now();
function frame(now) {
  const dt = Math.min(MAX_FRAME_SECONDS, (now - last) / 1000);
  last = now;
  if (game.state === 'playing') {
    game.time += dt;
    game.daynight.update(dt);
    game.player.update(dt);
    game.traffic.update(dt);
    game.police.update(dt);
    game.missions.update(dt);
    game.activities.update(dt);
    game.combat.update(dt);
    game.effects.update(dt);
    game.audio.update();
    game.hud.update(dt);
    game.save.autosave();
  }
  // Camera keeps easing even while paused so returning to play feels seamless.
  game.camera.update(dt, game.state === 'playing');
  render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// --- Render passes -----------------------------------------------------------

function render() {
  const cam = game.camera;
  // World-space pass: everything that lives inside the camera transform.
  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.scale(cam.zoom, cam.zoom);
  ctx.translate(-cam.x, -cam.y);
  game.world.draw(ctx, cam);
  game.traffic.draw(ctx, cam);
  game.police.draw(ctx, cam);
  game.combat.draw(ctx, cam);
  game.player.draw(ctx);
  game.effects.draw(ctx, cam);
  ctx.restore();
  // Screen-space passes: lighting, HUD, minimap, state overlays.
  game.daynight.drawOverlay(ctx, canvas);
  game.hud.draw(ctx, canvas);
  game.minimap.draw(ctx, canvas);
  if (game.state !== 'playing') game.hud.drawStateOverlay(ctx, canvas);
}
