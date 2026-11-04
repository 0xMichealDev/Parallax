import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

// This legacy film is only referenced by its retired player. If a template or
// another runtime script restores that player, its controls, or the film URL,
// fail before pruning any build assets so the reintroduced feature keeps working.
export function assertArchivedIntroUnused(projectRoot = process.cwd()) {
  const scan = directory => {
    if (!fs.existsSync(directory)) return;
    for (const entry of fs.readdirSync(directory, {withFileTypes: true})) {
      const file = path.join(directory, entry.name);
      if (entry.isSymbolicLink()) throw new Error('Unexpected source symlink during build asset review');
      if (entry.isDirectory()) { scan(file); continue; }
      if (!entry.isFile() || !/\.(?:[cm]?[jt]sx?|html|json|css)$/.test(entry.name)) continue;
      const relative = path.relative(projectRoot, file).split(path.sep).join('/');
      const text = fs.readFileSync(file, 'utf8');
      const retiredPlayer = relative === 'public/intro-film.js';
      const retiredTour = relative === 'public/guided-tour.js';
      const loadsPlayer = /\b(?:intro-film|guided-tour)\.js\b/.test(text);
      const linksFilm = !retiredPlayer && /parallax-introduction\.mp4/.test(text);
      const restoresEntry = !retiredPlayer && !retiredTour && !file.endsWith('.css') && /guided-tour-play|tour-play-top/.test(text);
      if (loadsPlayer || linksFilm || restoresEntry) {
        throw new Error(`The archived introduction is referenced by ${relative}; review before omitting its media.`);
      }
    }
  };
  scan(path.join(projectRoot, 'app'));
  scan(path.join(projectRoot, 'public'));
}

// Keep archived source media, but omit superseded, unreferenced assets from the
// deployment artifact so the complete site stays below 256 MiB. No source deletes.
export function pruneUnusedBuildAssets(projectRoot = process.cwd()) {
  projectRoot = fs.realpathSync(projectRoot);
  assertArchivedIntroUnused(projectRoot);
  const root = path.resolve(projectRoot, 'dist/client/assets');
  if (fs.existsSync(root) && !fs.realpathSync(root).startsWith(projectRoot + path.sep)) throw new Error('Build assets escape the source workspace');
  const obsolete = ['intro-film/parallax-introduction.mp4', 'scenery/worker/animation.bin','dashboard-flight/flight-1600-v122.mp4', 'dashboard-flight/flight-1920-v124.mp4', 'dashboard-flight/flight-original-1080-v125.mp4', 'dashboard-flight/flight-4k-v132.mp4', 'dashboard-flight/flight-hd-v132.mp4', 'dashboard-flight/flight-960-v122.mp4', 'desert-ground-texture.png', 'scenery/worker/web.glb', 'globe/8k_earth_clouds.jpg', 'globe/8k_earth_daymap.jpg', 'globe/8k_earth_nightmap.jpg', 'expeditions/material-atlas-v210.png'];
  for (const name of obsolete) {
    const target = path.resolve(root, name);
    if (!target.startsWith(root + path.sep)) throw new Error('Invalid build asset path');
    fs.rmSync(target, {force: true});
  }
  console.log(`Omitted ${obsolete.length} unused source assets from the deployment artifact.`);
  for(const folder of ['pvp-characters','pvp-environment']){const directory=path.join(root,folder);if(fs.existsSync(directory))for(const name of fs.readdirSync(directory)){if(name.endsWith('-provenance.json')||name.endsWith('-preview.png')||name.endsWith('-web-review.png')||name.endsWith('-optimized.png'))fs.rmSync(path.join(directory,name));}}
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) pruneUnusedBuildAssets();
