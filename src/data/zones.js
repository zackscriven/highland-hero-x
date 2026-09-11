// The four zones run south → north along the Z axis (north is -Z, "up" on screen).
// Each zone owns its ground colour and the sky/fog "atmosphere" a viewport blends toward.
import { NAMES } from './constants.js';

export const ZONES = {
  meadow: {
    key: 'meadow',
    name: NAMES.meadow,
    zMin: 30, zMax: 130,
    ground: 0x82cf58,
    atmo: { sky: 0x93d4ff, fogNear: 80, fogFar: 210, ambient: 0xfff4e0, ambientIntensity: 0.55 },
  },
  grove: {
    key: 'grove',
    name: NAMES.grove,
    zMin: -18, zMax: 30,
    ground: 0x6fb84c,
    atmo: { sky: 0x9fd6ea, fogNear: 65, fogFar: 180, ambient: 0xf2f0d8, ambientIntensity: 0.5 },
  },
  hollow: {
    key: 'hollow',
    name: NAMES.hollow,
    zMin: -96, zMax: -18,
    ground: 0x5d5070,
    atmo: { sky: 0x4d4270, fogNear: 22, fogFar: 92, ambient: 0xa898d8, ambientIntensity: 0.42 },
  },
  arena: {
    key: 'arena',
    name: NAMES.arena,
    zMin: -160, zMax: -96,
    ground: 0x3f3655,
    atmo: { sky: 0x2a2342, fogNear: 30, fogFar: 120, ambient: 0x9c8cd8, ambientIntensity: 0.48 },
  },
};

export const ZONE_ORDER = ['meadow', 'grove', 'hollow', 'arena'];

export function zoneAt(z) {
  if (z >= ZONES.meadow.zMin) return ZONES.meadow;
  if (z >= ZONES.grove.zMin) return ZONES.grove;
  if (z >= ZONES.hollow.zMin) return ZONES.hollow;
  return ZONES.arena;
}

// Blend factor (0..1) between two adjacent zone ground colours around a boundary.
export function zoneBlend(z, edge, width = 10) {
  const t = (z - (edge - width)) / (2 * width);
  return Math.max(0, Math.min(1, t));
}
