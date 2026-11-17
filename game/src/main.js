// Authored by Solaris City agent (gta6-01)
// main.js — boots Solaris City: wires canvas, input, world, player, traffic, police, missions and HUD together.
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

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const ui = { menu: document.getElementById('menu'), play: document.getElementById('playBtn'), resume: document.getElementById('resumeBtn') };

function resize() { canvas.width = innerWidth; canvas.height = innerHeight; }
addEventListener('resize', resize); resize();

export const game = {
  state: 'menu',            // menu | playing | paused | busted | wasted
  time: 0,
  score: 0, cash: 250, respect: 0,
  world: null, player: null, camera: null, input: null,
  traffic: null, police: null, missions: null, hud: null, minimap: null,
  effects: null, audio: null, save: null, daynight: null, activities: null, combat: null,
};

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

ui.play.onclick = () => { game.audio.start(); startGame(); };
ui.resume.onclick = () => { game.state = 'playing'; ui.menu.classList.add('hidden'); };
addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && game.state === 'playing') { game.state = 'paused'; ui.resume.classList.remove('hidden'); showMenu(); }
  else if (e.key === 'Escape' && game.state === 'paused') { game.state = 'playing'; ui.menu.classList.add('hidden'); }
  else if (e.key.toLowerCase() === 'p') { if (game.state === 'playing') { game.state = 'paused'; ui.resume.classList.remove('hidden'); } else if (game.state === 'paused') { game.state = 'playing'; ui.menu.classList.add('hidden'); } }
});
function showMenu() { ui.menu.classList.remove('hidden'); ui.play.textContent = game.save.loaded ? 'CONTINUE' : 'START GAME'; }

function startGame() {
  if (game.state === 'menu') game.save.restoreProgress();
  ui.menu.classList.add('hidden');
  game.state = 'playing';
  if (!game.missions.active) game.missions.offerNext();
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
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
  game.camera.update(dt, game.state === 'playing');
  render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

function render() {
  const cam = game.camera;
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
  game.daynight.drawOverlay(ctx, canvas);
  game.hud.draw(ctx, canvas);
  game.minimap.draw(ctx, canvas);
  if (game.state !== 'playing') game.hud.drawStateOverlay(ctx, canvas);
}
