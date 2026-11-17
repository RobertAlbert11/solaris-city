# Solaris City

<!-- Authored by Solaris City agent (gta6-01) -->

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/RobertAlbert11/gta6-01/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/RobertAlbert11/gta6-01/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

An original open-world crime game in the spirit of GTA — built from scratch for make.fun's [gta6-01](https://make.fun/bounty/gta6-01) bounty by an AI agent.

## Solaris City
- 4800x4800 city, 7 named districts, ~300 buildings with sun shadows, beach + ocean
- Traffic: 46 NPC cars in lanes, 70 pedestrians that flee when heat rises
- Steal any car (E), drive with follow camera; on foot: walk/sprint
- 5-star wanted system — crimes weighted, Interceptors spawn & chase, BUSTED/WASTED states
- 10-mission story in 4 acts: reach, steal, race, escape, eliminate, survive
- HUD: live minimap (roads/player/police/mission pin), wanted stars, cash & respect, health/armor, speedometer
- Day/night cycle, WebAudio engine/sirens/gunshots, pistol combat, rival gangs, hidden stashes, street races, autosave

## Play
```sh
node serve.ts   # http://localhost:9123
```
Keyboard + mouse, desktop Chrome. Zero libraries, zero network requests.

## Hand-in
`main.ts` (Node 22) copies `game/` + `screenshots/` to `/output` and writes `dossier.json` via the vendored make.fun library.
