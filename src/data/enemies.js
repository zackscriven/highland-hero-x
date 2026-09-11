// Enemy tuning + ambient spawn points. Wolves are fast and weak; bears are slow and tough.
export const ENEMY_TYPES = {
  wolf: {
    name: 'Wolf', hp: 48, speed: 9.2, damage: 9, radius: 0.95,
    aggroRange: 17, attackRange: 2.3, windup: 0.35, attackCooldown: 1.15,
    leash: 34, knockbackResist: 1.0, color: 0x8d93a1,
  },
  bear: {
    name: 'Bear', hp: 150, speed: 5.8, damage: 20, radius: 1.5,
    aggroRange: 14, attackRange: 3.0, windup: 0.55, attackCooldown: 1.9,
    leash: 28, knockbackResist: 0.45, color: 0x6b4a32,
  },
};

// Roaming packs that aren't tied to a charm — Wolf Hollow should never feel empty.
export const AMBIENT_SPAWNS = [
  { type: 'wolf', x: 8, z: -32 }, { type: 'wolf', x: 14, z: -36 },
  { type: 'wolf', x: -12, z: -60 }, { type: 'wolf', x: -6, z: -66 },
  { type: 'bear', x: 22, z: -52 },
  { type: 'wolf', x: 60, z: -40 }, { type: 'wolf', x: 66, z: -46 },
  { type: 'bear', x: -70, z: -60 },
  { type: 'wolf', x: 30, z: -88 }, { type: 'wolf', x: 36, z: -84 },
];

export const RESPAWN_SECONDS = 50;

// Healing berries: fixed bushes around the map plus drops from beaten enemies.
export const BERRY_SPOTS = [
  { x: 14, z: 84 }, { x: -20, z: 100 }, { x: 30, z: 60 }, { x: -60, z: 60 },
  { x: -8, z: 20 }, { x: 40, z: 22 }, { x: -40, z: -2 }, { x: 8, z: -6 },
  { x: 0, z: -28 }, { x: -30, z: -56 }, { x: 44, z: -60 }, { x: -50, z: -76 }, { x: 10, z: -80 },
  { x: 0, z: -104 }, { x: 12, z: -136 }, { x: -14, z: -128 },
];
export const BERRY_HEAL = 30;
export const BERRY_RESPAWN = 35;
