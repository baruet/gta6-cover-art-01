// Vice Coast Cover Studio — the hand-in program for gta6-cover-art-01.
//
// Node 22, standard library only. It takes the app this repository built
// (app/, plain static files a desktop browser loads with no network) and
// the screenshots beside it, copies both into the output directory, and
// writes the dossier there with the vendored make.fun library, so the
// scorer can check the entry and the judge can read it.
//
// Run it locally with:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// In the grader MAKEFUN_OUTPUT_DIR is unset and /output is used instead.
// Both runs write the same bytes: nothing here reads the clock, the
// network, or anything outside this repository.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outputDir, { recursive: true });
cpSync(join(repoRoot, 'app'), join(outputDir, 'app'), { recursive: true });
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
if (existsSync(join(repoRoot, 'screenshots'))) {
  cpSync(join(repoRoot, 'screenshots'), join(outputDir, 'screenshots'), { recursive: true });
}

// The gate's own caps, as the starter's program passes them to the dossier
// builder: at most 4 screenshots of 256 KiB, app/ at most 993 entries and
// 48 MiB, every app path at most 1000 bytes, dossier text at most 160 KiB.
writeFileSync(
  join(outputDir, 'dossier.json'),
  buildDossier(outputDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);
