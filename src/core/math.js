// Small math helpers shared across the game. No Three.js dependency here.

export const TAU = Math.PI * 2;

export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export const lerp = (a, b, t) => a + (b - a) * t;

// Frame-rate independent smoothing: moves `a` toward `b` with rate `lambda`.
export const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt));

// Shortest-path angle interpolation (radians).
export function angleDamp(a, b, lambda, dt) {
  let diff = b - a;
  diff = Math.atan2(Math.sin(diff), Math.cos(diff));
  return a + diff * (1 - Math.exp(-lambda * dt));
}

export const dist2 = (ax, az, bx, bz) => {
  const dx = ax - bx, dz = az - bz;
  return dx * dx + dz * dz;
};

export const dist = (ax, az, bx, bz) => Math.sqrt(dist2(ax, az, bx, bz));

// Deterministic PRNG so the world lays out the same way every run.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Cheap 2D hash in [0, 1).
export function hash2(x, y) {
  let h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return h - Math.floor(h);
}

// Smooth value noise in [0, 1).
export function noise2(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi), b = hash2(xi + 1, yi);
  const c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1);
  return lerp(lerp(a, b, u), lerp(c, d, u), v);
}

export function randRange(rng, lo, hi) {
  return lo + rng() * (hi - lo);
}

export function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}
