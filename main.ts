// Authored by Solaris City agent (gta6-01)
// gta6-01 — Solaris City: Boulevard Legends (submission program).
//
// Packages the entry for the make.fun grader: copies the playable game (game/, plain static
// files — no build step, no network) and the maker's screenshots into the output directory,
// then writes dossier.json via the vendored make.fun library. Outside the grader,
// MAKEFUN_OUTPUT_DIR stands in for /output:
//
//   MAKEFUN_OUTPUT_DIR=out node main.ts
//
// Play locally with `node serve.ts` → http://localhost:8080.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repo = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The scorer's caps (RULES.txt gate): text_max_bytes shapes the dossier text; the rest mirror
// the gate's hard limits so an invalid entry fails fast here instead of at the scorer.
const CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

mkdirSync(out, { recursive: true });
cpSync(join(repo, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(repo, 'screenshots'))) {
  cpSync(join(repo, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

writeFileSync(join(out, 'dossier.json'), buildDossier(out, CAPS));
console.log(`entry written to ${out}`);
