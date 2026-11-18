# NOTES.md — Architecture Overview

Top-down 2D open-world driving game ("GTA6" sandbox). Vanilla JS ES modules,
single canvas, no frameworks or build step. `game/index.html` loads
`game/src/main.js` as the entry point.

## Core loop

`main.js` owns a `Game` object and a fixed rAF loop: input → update(dt) →
draw. Every subsystem is a class instantiated with a reference to `game`
(plain dependency injection, no singletons), so modules stay decoupled and
testable.

## Module map

- **main.js** — composition root. Creates canvas, wires every system into
  `game`, runs the update/draw loop.
- **input.js** — keyboard state machine; exposes edge-triggered consumers
  like `consumeEnterExit()` so actions fire once per press.
- **world.js** — tile grid constants (`TILE`, `GRID_W/H`, `WORLD_W/H`),
  terrain generation, road checks, `districtNameAt()`.
- **player.js** — `Player` class: movement (foot vs vehicle), health/armor
  with slow regen when calm, vehicle enter/exit, world bounds clamping.
- **camera.js** — follows the player, clamped to world bounds.
- **traffic.js** — ambient AI cars driving on roads; `drawCar()` renderer.
- **police.js** — wanted-star system (0..5), heat decay, spawns police cars,
  roadblocks at 3+, `bustedCheck()` and `clear()`.
- **combat.js** — shooting/damage helpers, tile-aware collision.
- **missions.js** — mission state machine with objectives on the world grid.
- **activities.js** — side activities (pickups/events) placed on grid tiles.
- **hud.js** — status bar, toasts (`hud.toast(msg)`), wasted/busted overlays.
- **minimap.js** — corner map rendering world tiles + blips.
- **effects.js** — particle FX (explosions, muzzle flashes).
- **audio.js** — WebAudio blips for actions; lazily created AudioContext.
- **save.js** — localStorage persistence of progress.
- **daynight.js / nightsky.js** — day/night tinting cycle and star field.

## New in this change

- **weather.js** — `Weather` class cycling clear → rain → storm → fog on a
  timer. Rain/storm spawn streakline particle drops (storm denser + wind
  drift + lightning flashes that whiteout the screen briefly); fog is a
  translucent overlay. `set(type)` forces a phase; `draw()` renders over the
  world but under the HUD.
- **cheats.js** — `CheatSystem` captures single-character keys into a
  rolling buffer (last 16 chars, expires after 3s idle). Buffer suffix match
  against classic codes: `HESOYAM` (health+armor), `AEZAKMI` (wanted clear
  via `police.clear()`), `TPHERE` (teleport to marker/spawn). Callbacks
  return a message shown through `hud.toast`.

## Conventions

- ES modules only, no classes exported as singletons — pass `game` around.
- Constants live at file top; comments explain *why* lines exist.
- HUD feedback goes through `hud.toast()`; systems never touch the DOM
  directly except canvas rendering.
- Syntax gate: `node --check game/src/<file>.js` must pass for every module.
