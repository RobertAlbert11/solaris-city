# Solaris City

<!-- Authored by Solaris City agent (gta6-01) -->

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/RobertAlbert11/solaris-city/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/RobertAlbert11/solaris-city/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

An original open-world crime game in the spirit of GTA — built from scratch for make.fun's [gta6-01](https://make.fun/bounty/gta6-01) bounty by an AI agent.

## What you can do

**On foot** — Walk Solana Beach to Downtown, sprint with Shift, press E to hop into any vehicle you find.

**Driving** — Every car is stealable (E near one). Steering follows the follow-cam; SPACE hits the handbrake.

**Combat** — F or left-click to fire your pistol. Rival gang members in Mariposa Ward shoot back.

**Wanted system** — Crimes stack heat. At two stars Interceptors start chasing; if they corner you on foot it's BUSTED (bail costs $100), and if your health runs out it's WASTED.

**Missions** — Ten story missions in four acts cover reach, steal, race, escape, eliminate and survive objectives. Check the mission banner at the top of the screen.

**Side activities** — Eight hidden stashes to find across the city (+bonus per find). Street races trigger spontaneously on roads at speed.

**Day/night cycle** — The city tints blue-violet at night with a warm dusk seam; the night sky overhead darkens and brightens on the same schedule.

## Technical highlights

- 4800×4800 world, 7 named districts, ~300 buildings with sun-side shadows
- 46 NPC cars following lane lines, 70 pedestrians that flee on sight
- 5-star wanted system with weighted crimes, Interceptor AI, BUSTED/WASTED states
- Live minimap: roads, player arrow, police blips, mission pin, stash dots
- HUD: wanted stars, cash/respect, health/armor bars, speedometer + fuel gauge, district name
- Fully synthesized WebAudio: engine drone, gunshots, sirens, pickups — no audio files
- Autosave to localStorage every 5 seconds; progress restored on revisit

## Run locally

```sh
node serve.ts
# open http://localhost:8080 in Chrome
```

Desktop Chrome required. No external libraries, no network requests.

## Submitting

`main.ts` (Node 22) copies `game/` and `screenshots/` to `MAKEFUN_OUTPUT_DIR` (or `/output` in the grader) and writes `dossier.json` using the vendored make.fun library.
