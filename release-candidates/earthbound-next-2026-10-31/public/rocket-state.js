/* Earthbound flight-controller candidate; not deployed.
 * Preserves v227's geometry, coordinates, timings and browser export.
 * No wallet actions, network requests, storage writes or new dependencies. */
(() => {
  'use strict';
  const fallback = ['Mercury','Venus','Earth','Moon','Mars','Jupiter','Europa','Saturn','Uranus','Neptune','Pluto'];
  const catalog = typeof solarSystemWorlds !== 'undefined' && Array.isArray(solarSystemWorlds)
    ? solarSystemWorlds.map(w => w && w.name).filter(name => typeof name === 'string' && name.trim()) : [];
  const PLANETS = [...new Set(catalog.length ? catalog : fallback)];
  const BOARDING = {x: -105, z: -110, deck: 54};
  const defaultPlanet = PLANETS.includes('Mars') ? 'Mars' : PLANETS[0];
  const finite = Number.isFinite;
  const validPoint = p => !!p && finite(p.x) && finite(p.z);
  const create = (planet = defaultPlanet) => ({mode:'ground', elapsed:0, rise:0, planet:PLANETS.includes(planet) ? planet : defaultPlanet});

  function selectDestination(f, planet) {
    if (!f || !['ground','cabin'].includes(f.mode) || !PLANETS.includes(planet)) return false;
    f.planet = planet;
    return true;
  }
  function board(f, p, driving) {
    if (!f || f.mode !== 'ground' || driving || !validPoint(p) || Math.hypot(p.x-BOARDING.x,p.z-BOARDING.z)>3.3) return false;
    Object.assign(f, {mode:'lift', elapsed:0, rise:0});
    return true;
  }
  function launch(f, planet = f && f.planet) {
    if (!f || f.mode !== 'cabin' || !PLANETS.includes(planet)) return false;
    Object.assign(f, {mode:'launch', elapsed:0, rise:0, planet});
    return true;
  }
  function tick(f, dt) {
    if (!f || !['lift','launch'].includes(f.mode) || !finite(f.elapsed) || f.elapsed < 0 || !finite(dt) || dt <= 0) return false;
    f.elapsed += Math.min(.1, dt);
    if (f.mode === 'lift') {
      const p = Math.min(1, f.elapsed / 5);
      f.rise = BOARDING.deck * p * p * (3 - 2 * p);
      if (p === 1) Object.assign(f, {mode:'cabin', elapsed:0, rise:0});
    } else {
      const p = Math.min(1, Math.max(0, (f.elapsed - 3) / 8));
      f.rise = 1200 * p * p;
      if (p === 1) f.mode = 'orbit';
    }
    return true;
  }
  function exit(f) {
    if (!f) return false;
    // Cancelling travel must not silently replace a selected destination with Mars.
    Object.assign(f, create(f.planet));
    return true;
  }
  function cabinMove(p, forward, side, dt) {
    if (!validPoint(p) || ![p.yaw,forward,side,dt].every(finite) || dt <= 0) return false;
    const length = Math.hypot(forward,side);
    if (!length || !finite(length)) return false;
    const step = 1.5 * Math.min(.05,dt) / Math.max(1,length);
    const x = p.x + (Math.sin(p.yaw)*forward + Math.cos(p.yaw)*side)*step;
    const z = p.z + (-Math.cos(p.yaw)*forward + Math.sin(p.yaw)*side)*step;
    if (!finite(x) || !finite(z) || Math.hypot(x+110,z+120)>2.16 || z>-118.6 || z< -122.0) return false;
    if ([-111.2,-108.8].some(s => Math.hypot(x-s,z+120.4)<.60)) return false;
    p.distance = (finite(p.distance) ? p.distance : 0) + Math.hypot(x-p.x,z-p.z);
    p.x = x; p.z = z;
    return true;
  }
  const api = {PLANETS,BOARDING,create,selectDestination,board,launch,tick,exit,cabinMove};
  if (typeof window !== 'undefined') window.ParallaxRocket = api;
  if (typeof module !== 'undefined') module.exports = api;
})();
