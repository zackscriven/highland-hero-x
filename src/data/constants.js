// Easy-to-edit names and tuning values. Zoë can rename anything in NAMES
// without breaking the game.
import * as THREE from 'three';

export const NAMES = {
  game: 'Highland Hero X',
  subtitle: 'Recover the Highland Charms. Save the grasslands.',
  cow: 'Highland Hero',
  meadow: 'Sunny Meadow',
  grove: 'Training Grove',
  hollow: 'Wolf Hollow',
  arena: 'The Howling Ring',
  boss: 'The Three-Headed Wolf',
  charm: 'Highland Charm',
  charms: 'Highland Charms',
};

export const CAMERA = {
  fov: 40,
  offset: new THREE.Vector3(0, 30, 21), // fixed isometric-ish angle, looking north (-Z)
  followLambda: 7,
  lookAhead: 2.0,
};

export const WORLD = {
  seed: 2016, // Zoë's birth year — keeps the world layout identical every run
  bounds: { xMin: -104, xMax: 104, zMin: -148, zMax: 120 },
};

export const COW = {
  radius: 1.0,
  walkSpeed: 8.5,
  sprintSpeed: 13.5,
  turnLambda: 12,
  healthMax: 100,
  staminaMax: 100,
  staminaDrain: 24, // per second while sprinting
  staminaRegen: 22, // per second while not sprinting
};
