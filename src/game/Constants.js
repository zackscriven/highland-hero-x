// Easy-to-edit names and tuning values for the MVP.
// Zoe can rename anything in here without breaking the game.

export const NAMES = {
  cow: 'Highland Hero',
  meadow: 'Safe Meadow',
  trainingGrove: 'Training Grove',
  wolfHollow: 'Wolf Hollow',
  boss: 'Three-Headed Wolf',
};

export const COLORS = {
  sky: 0x87ceeb,
  meadowGrass: 0x6cbf5c,
  cowBody: 0xb86b3a,
  cowFringe: 0xf4d8a8,
  cowHorn: 0xeae2c8,
  cowMuzzle: 0xf2c79a,
  cowHoof: 0x3b2417,
  cowEye: 0x111111,
};

export const PLAYER = {
  walkSpeed: 6,
  sprintSpeed: 10,
  turnSpeed: 10,
  staminaMax: 100,
  staminaDrain: 25,
  staminaRegen: 18,
  startPos: { x: 0, z: 15 }, // center of Safe Meadow
};

export const STATS_INITIAL = {
  health: 100,
  healthMax: 100,
  hunger: 100,
  hungerMax: 100,
  thirst: 100,
  thirstMax: 100,
  stamina: 100,
  staminaMax: 100,
  strength: 1,
  strengthMax: 10,
  courage: 0,
  courageMax: 10,
};

// Per-training-spot config. Keyed by world.trainingSpots[n].key.
export const TRAINING_CONFIG = {
  headbutt: {
    statKey: 'strength', statGain: 1, statCap: 10, cooldown: 18,
    unlockMsg: 'Unlocked: Headbutt!',
    statGainMsg: (v) => `+1 Strength (${v}/10)`,
  },
  sprint: {
    statKey: 'staminaMax', statGain: 20, statCap: 200, cooldown: 18,
    unlockMsg: 'Unlocked: Stampede Charge!',
    statGainMsg: (v) => `+Stamina Capacity (${v})`,
  },
  shield: {
    statKey: 'courage', statGain: 1, statCap: 10, cooldown: 18,
    unlockMsg: 'Unlocked: Horn Shield!',
    statGainMsg: (v) => `+1 Courage (${v}/10)`,
  },
  echo: {
    statKey: null, statGain: 0, statCap: 0, cooldown: 25,
    unlockMsg: 'Unlocked: Moo Blast!',
    statGainMsg: null,
  },
  grass: {
    statKey: null, statGain: 0, statCap: 0, cooldown: 25,
    unlockMsg: 'Unlocked: Grass Power!',
    statGainMsg: null,
  },
};

export const ABILITIES = [
  { key: 'headbutt', label: 'Headbutt', input: 'Space' },
  { key: 'stampede', label: 'Stampede Charge', input: 'Shift+Space' },
  { key: 'shield', label: 'Horn Shield', input: 'Q' },
  { key: 'moo', label: 'Moo Blast', input: 'F' },
  { key: 'grass', label: 'Grass Power', input: 'R' },
];

export const DECAY = {
  hunger:            0.8,  // per second
  thirst:            1.0,
  healthFromHunger:  1.5,  // extra per second when hunger = 0
  healthFromThirst:  2.0,
  healthFromPoison:  1.0,
};

export const POISON = {
  duration:   30,   // seconds
  speedMult:  0.5,  // fraction of normal speed while poisoned
};

export const INTERACT = {
  range:         9,  // max distance for E-press (units)
  waterCooldown: 5,
  foodCooldown:  8,
};

export const WORLD = {
  groundSize: 200,
};
