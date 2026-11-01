import fs from 'node:fs';
import path from 'node:path';

// Keep archived source media, but omit superseded, unreferenced dashboard videos
// from the deployment artifact so the complete site stays below 256 MiB.
const root = path.resolve('dist/client/assets');
const obsolete = ['dashboard-flight/flight-1600-v122.mp4', 'dashboard-flight/flight-1920-v124.mp4', 'dashboard-flight/flight-original-1080-v125.mp4', 'desert-ground-texture.png', 'scenery/worker/web.glb', 'globe/8k_earth_clouds.jpg', 'globe/8k_earth_daymap.jpg', 'globe/8k_earth_nightmap.jpg', 'expeditions/material-atlas-v210.png'];
for (const name of obsolete) {
  const target = path.resolve(root, name);
  if (!target.startsWith(root + path.sep)) throw new Error('Invalid build asset path');
  fs.rmSync(target, { force: true });
}
console.log('Omitted nine unused source assets from the deployment artifact.');
