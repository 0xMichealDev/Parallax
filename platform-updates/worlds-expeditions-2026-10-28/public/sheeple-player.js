/* The Lunar Flock's player simulation. No DOM, timers, storage or remote services. */
(() => {
  'use strict';

  const IDS = Object.freeze(['flock', 'signal', 'bell']);
  const freeze = value => {
    if (value && typeof value === 'object') {
      Object.values(value).forEach(freeze);
      Object.freeze(value);
    }
    return value;
  };
  const WORLD = freeze({
    spawn:{x:0, z:11, yaw:Math.PI},
    board:{x:4.7, z:7.6, radius:2.4},
    flock:{x:-2.1, z:3, radius:3.5},
    signal:{x:5.7, z:-.6, radius:2.3},
    bell:{x:-8.3, z:-8.9, radius:1.55},
    sparks:[{x:1.8, z:2.9}, {x:3.3, z:.9}, {x:4.3, z:-1}],
    bounds:{minX:-19, maxX:19, minZ:-19, maxZ:18},
    obstacles:[
      {x:5.7, z:-3.3, radius:1.45},
      {x:-11, z:5, radius:1.1},
      {x:8.4, z:4.8, radius:1.35},
      {x:-13, z:-3, radius:1.7},
      {x:11.5, z:-1, radius:1.4},
      {x:4.7, z:7.6, radius:.9},
      {x:-10.45, z:-6.6, radius:.7},
      {x:-6.15, z:-6.6, radius:.7}
    ],
    player:{radius:.42, scale:.75, speed:3.8, jumpVelocity:5.4, gravity:9}
  });
  const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
  const finite = value => Number.isFinite(value) ? value : 0;
  const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
  const angleDelta = (to, from) => Math.atan2(Math.sin(to - from), Math.cos(to - from));

  function create(options = {}) {
    const sample = typeof options.groundHeight === 'function' ? options.groundHeight : () => 0;
    const floor = (x, z) => finite(sample(x, z));
    const completed = new Set();
    const sparks = WORLD.sparks.map(() => false);
    let enabled = false, inputRight = 0, inputForward = 0, verticalSpeed = 0;
    const player = {
      x:WORLD.spawn.x, y:floor(WORLD.spawn.x, WORLD.spawn.z), z:WORLD.spawn.z,
      yaw:WORLD.spawn.yaw, vx:0, vz:0, grounded:true, gait:0, baaTime:0, jumpCount:0
    };

    function emit(event) {
      try { options.onEvent?.(event); } catch { /* A view callback cannot stop the simulation. */ }
    }
    function complete(id) {
      if (completed.has(id)) return false;
      completed.add(id);
      try { options.onComplete?.(id); } catch { /* The scene remains playable if a view fails. */ }
      emit({type:'complete', id});
      return true;
    }
    function setCompleted(ids) {
      if (Array.isArray(ids)) for (const id of ids) if (IDS.includes(id)) completed.add(id);
      if (completed.has('signal')) sparks.fill(true);
      return getState();
    }
    function nearby() {
      let nearest = null, nearestRatio = Infinity;
      for (const id of ['board', 'flock', 'signal', 'bell']) {
        const place = WORLD[id], ratio = distance(player, place) / place.radius;
        if (ratio <= 1 && ratio < nearestRatio) { nearest = id; nearestRatio = ratio; }
      }
      return nearest;
    }
    function getState() {
      return {
        ...player, speed:Math.hypot(player.vx, player.vz),
        height:Math.max(0, player.y - floor(player.x, player.z)),
        nearby:nearby(), sparks:sparks.slice(), completed:IDS.filter(id => completed.has(id)), enabled
      };
    }
    function setMove(right, forward) {
      if (!enabled) { inputRight = inputForward = 0; return false; }
      right = clamp(finite(right), -1, 1); forward = clamp(finite(forward), -1, 1);
      const magnitude = Math.max(1, Math.hypot(right, forward));
      inputRight = right / magnitude; inputForward = forward / magnitude;
      return true;
    }
    function setEnabled(value) {
      enabled = !!value;
      if (!enabled) {
        inputRight = inputForward = 0;
        player.vx = player.vz = 0;
        player.baaTime = 0;
      }
      return enabled;
    }
    function jump() {
      if (!enabled || !player.grounded) return false;
      player.grounded = false;
      verticalSpeed = WORLD.player.jumpVelocity;
      player.jumpCount++;
      emit({type:'jump'});
      return true;
    }
    function baa() {
      if (!enabled || player.baaTime > 0) return false;
      player.baaTime = .9;
      const withFlock = distance(player, WORLD.flock) <= WORLD.flock.radius;
      emit({type:'baa', flock:withFlock, message:withFlock ? 'Baa! The flock answers.' : 'Baa-aa!'});
      if (withFlock) complete('flock');
      return true;
    }
    function interact() {
      if (!enabled) return false;
      const place = nearby();
      if (place === 'board') { emit({type:'board'}); return true; }
      if (place !== 'signal') return false;
      if (!sparks.every(Boolean)) {
        emit({type:'hint', message:'Jump through all three signal rings first.'});
        return true;
      }
      if (!complete('signal')) emit({type:'hint', message:'The signal is already awake.'});
      return true;
    }
    function checkAirborneDiscoveries() {
      const height = player.y - floor(player.x, player.z);
      if (player.grounded || height <= .28) return;
      WORLD.sparks.forEach((spark, index) => {
        if (sparks[index] || distance(player, spark) >= 1.1) return;
        sparks[index] = true;
        const count = sparks.filter(Boolean).length;
        emit({type:'spark', index, count, message:count === 3 ? 'All three signals collected. Walk to the station and wake the beacon.' : 'Signal collected. ' + count + ' of 3.'});
      });
      if (height > .45 && distance(player, WORLD.bell) <= WORLD.bell.radius) complete('bell');
    }
    function constrainPosition(nextX, nextZ) {
      const radius = WORLD.player.radius, bounds = WORLD.bounds;
      nextX = clamp(nextX, bounds.minX + radius, bounds.maxX - radius);
      nextZ = clamp(nextZ, bounds.minZ + radius, bounds.maxZ - radius);
      for (const obstacle of WORLD.obstacles) {
        const dx = nextX - obstacle.x, dz = nextZ - obstacle.z;
        const minimum = obstacle.radius + radius, separation = Math.hypot(dx, dz);
        if (separation >= minimum) continue;
        // The previous position supplies a stable normal in the degenerate center case.
        const previousX = player.x - obstacle.x, previousZ = player.z - obstacle.z;
        const previousLength = Math.hypot(previousX, previousZ) || 1;
        const nx = separation > 1e-9 ? dx / separation : previousX / previousLength;
        const nz = separation > 1e-9 ? dz / separation : previousZ / previousLength;
        nextX = obstacle.x + nx * minimum; nextZ = obstacle.z + nz * minimum;
        const inward = player.vx * nx + player.vz * nz;
        if (inward < 0) { player.vx -= inward * nx; player.vz -= inward * nz; }
      }
      const x = clamp(nextX, bounds.minX + radius, bounds.maxX - radius);
      const z = clamp(nextZ, bounds.minZ + radius, bounds.maxZ - radius);
      if ((x <= bounds.minX + radius && player.vx < 0) || (x >= bounds.maxX - radius && player.vx > 0)) player.vx = 0;
      if ((z <= bounds.minZ + radius && player.vz < 0) || (z >= bounds.maxZ - radius && player.vz > 0)) player.vz = 0;
      return {x, z};
    }
    function integrate(dt, cameraYaw) {
      const sin = Math.sin(cameraYaw), cos = Math.cos(cameraYaw);
      const desiredX = (cos * inputRight - sin * inputForward) * WORLD.player.speed;
      const desiredZ = (-sin * inputRight - cos * inputForward) * WORLD.player.speed;
      const moving = Math.hypot(inputRight, inputForward) > .001;
      const response = 1 - Math.exp(-(moving ? 12 : 16) * dt);
      player.vx += (desiredX - player.vx) * response;
      player.vz += (desiredZ - player.vz) * response;
      if (!moving && Math.hypot(player.vx, player.vz) < .002) player.vx = player.vz = 0;
      const position = constrainPosition(player.x + player.vx * dt, player.z + player.vz * dt);
      const travelled = Math.hypot(position.x - player.x, position.z - player.z);
      player.x = position.x; player.z = position.z;
      player.gait = (player.gait + travelled * 6.5) % (Math.PI * 2);
      if (Math.hypot(player.vx, player.vz) > .04) {
        const facing = Math.atan2(player.vx, player.vz);
        player.yaw += angleDelta(facing, player.yaw) * (1 - Math.exp(-14 * dt));
        player.yaw = Math.atan2(Math.sin(player.yaw), Math.cos(player.yaw));
      }
      const surface = floor(player.x, player.z);
      if (player.grounded) { player.y = surface; verticalSpeed = 0; }
      else {
        verticalSpeed -= WORLD.player.gravity * dt;
        player.y += verticalSpeed * dt;
        if (player.y <= surface) {
          player.y = surface;
          if (verticalSpeed <= 0) {
            player.grounded = true; verticalSpeed = 0;
            emit({type:'land'});
          }
        }
      }
      player.baaTime = Math.max(0, player.baaTime - dt);
      checkAirborneDiscoveries();
    }
    function step(dt, cameraYaw = 0) {
      if (!enabled || !Number.isFinite(dt) || dt <= 0) return getState();
      // Ignore time spent suspended. Bounded, small steps prevent a resumed tab from
      // tunnelling through rocks or skipping a mission's interaction radius.
      const elapsed = Math.min(dt, .25), steps = Math.max(1, Math.ceil(elapsed * 60));
      cameraYaw = finite(cameraYaw);
      for (let i = 0; i < steps && enabled; i++) integrate(elapsed / steps, cameraYaw);
      return getState();
    }
    function reset() {
      inputRight = inputForward = verticalSpeed = 0;
      Object.assign(player, {
        x:WORLD.spawn.x, y:floor(WORLD.spawn.x, WORLD.spawn.z), z:WORLD.spawn.z,
        yaw:WORLD.spawn.yaw, vx:0, vz:0, grounded:true, gait:0, baaTime:0
      });
      return getState();
    }

    setCompleted(options.completed);
    return {setMove, jump, baa, interact, step, setEnabled, setCompleted, reset, getState};
  }

  const api = {create, WORLD};
  if (typeof window !== 'undefined') window.ParallaxSheeplePlayer = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
