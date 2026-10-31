/* Candidate integration helpers: explicit calls only, not connected to the live renderer.
 * No animation loop, DOM injection, network access, autoplay or data persistence.
 * The owning scene must wire input, rendering, accessibility and navigation. */
(() => {
  'use strict';
  const finite = Number.isFinite;
  const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
  const smooth = n => n*n*(3-2*n);
  const point = p => !!p && finite(p.x) && finite(p.z);
  const CAMERA_KEYS = ['x','y','z','yaw','pitch','fov'];

  function createTelescope({rocket, flight, destinations, anchor={x:3.5,z:-13}, radius=2.8}) {
    if (!rocket || typeof rocket.selectDestination !== 'function' || !flight || !Array.isArray(destinations) || !point(anchor) || !finite(radius) || radius<=0) throw new TypeError('Invalid telescope configuration');
    // The caller supplies reviewed catalog IDs, not arbitrary URLs or inferred tickers.
    const records = new Map();
    for (const item of destinations) {
      if (!item || typeof item.id!=='string' || !item.id.trim() || typeof item.name!=='string' || !item.name.trim() || records.has(item.id)) throw new TypeError('Destinations need unique IDs and names');
      records.set(item.id, Object.freeze({id:item.id,name:item.name,rocketPlanet:item.rocketPlanet}));
    }
    const origin = {x:anchor.x,z:anchor.z};
    let active=false, selected=null;
    const supported = item => !!item && Array.isArray(rocket.PLANETS) && rocket.PLANETS.includes(item.rocketPlanet);
    function enter(player, driving=false) {
      if (active || driving || flight.mode!=='ground' || !point(player) || Math.hypot(player.x-origin.x,player.z-origin.z)>radius) return false;
      active=true; selected=null;
      return true;
    }
    function inspect(id) {
      if (!active || flight.mode!=='ground') return null;
      if (!records.has(id)) { selected=null; return null; }
      selected=records.get(id);
      return {...selected,launchable:supported(selected)};
    }
    function close() { active=false; selected=null; }
    function commit() {
      if (!active || flight.mode!=='ground' || !selected) return {ok:false,reason:'no-active-selection'};
      if (!supported(selected)) return {ok:false,reason:'destination-not-connected'};
      if (!rocket.selectDestination(flight,selected.rocketPlanet)) return {ok:false,reason:'selection-rejected'};
      const result={ok:true,id:selected.id,planet:flight.planet};
      close();
      return result;
    }
    return {enter,inspect,commit,close,get isOpen(){return active;}};
  }

  // Camera angles and FOV are radians. Use an immutable source pose for each transition.
  function blendCamera(from,to,progress,{reducedMotion=false}={}) {
    if (!from || !to || !CAMERA_KEYS.every(k=>finite(from[k])&&finite(to[k])) || from.fov<=0 || from.fov>=Math.PI || to.fov<=0 || to.fov>=Math.PI) throw new TypeError('Invalid camera pose');
    const p=finite(progress)?clamp(progress,0,1):0;
    const t=reducedMotion?(p>0?1:0):smooth(p);
    const pose={};
    for (const k of ['x','y','z','pitch','fov']) pose[k]=from[k]+(to[k]-from[k])*t;
    const shortest=Math.atan2(Math.sin(to.yaw-from.yaw),Math.cos(to.yaw-from.yaw));
    pose.yaw=from.yaw+shortest*t;
    return pose;
  }

  // Gain targets only. Reuse the existing audio graph and smooth changes there.
  // Calls cannot create or resume audio; a deliberate user audio action remains required.
  function ambienceTargets(player,{fire={x:0,z:-8},radius=24,enabled=false,hidden=false,flightMode='ground'}={}) {
    if (!point(fire) || !finite(radius) || radius<=0) throw new TypeError('Invalid ambience source');
    if (!enabled || hidden || !point(player)) return {fire:0,wind:0};
    if (flightMode!=='ground') return {fire:0,wind:0};
    const distance=Math.hypot(player.x-fire.x,player.z-fire.z);
    return {fire:1-smooth(clamp(distance/radius,0,1)),wind:.24};
  }

  // Flight UI follows the existing controller; it does not trigger routing or a second timer.
  function flightPresentation(f) {
    const elapsed=finite(f && f.elapsed)?Math.max(0,f.elapsed):0;
    switch (f && f.mode) {
      case 'lift': return {stage:'boarding',progress:clamp(elapsed/5,0,1),countdown:null};
      case 'cabin': return {stage:'ready',progress:0,countdown:null};
      case 'launch': return elapsed<3
        ? {stage:'countdown',progress:0,countdown:Math.ceil(3-elapsed)}
        : {stage:'ascent',progress:clamp((elapsed-3)/8,0,1),countdown:null};
      case 'orbit': return {stage:'arrival-ready',progress:1,countdown:null};
      default: return {stage:'ground',progress:0,countdown:null};
    }
  }
  const api={createTelescope,blendCamera,ambienceTargets,flightPresentation};
  if (typeof window!=='undefined') window.ParallaxObservatoryJourney=api;
  if (typeof module!=='undefined') module.exports=api;
})();
