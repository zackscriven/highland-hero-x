// Cow skins. Every skin recolours the same base model — no separate rigs.
// Add a new entry here and it shows up in the skin selector automatically.
//
// unlocked: true  → available from the start
// unlockCharm: id → unlocked when that Highland Charm is recovered (Phase 2+)

export const SKINS = [
  {
    id: 'classic',
    name: 'Classic Highland',
    blurb: 'The original shaggy Highland cow. Warm, fluffy, brave.',
    unlocked: true,
    colors: {
      body: 0xb9672f, fringe: 0xf1cf94, belly: 0xd08a52,
      horn: 0xefe4c6, hornTip: 0xfff6dd,
      snout: 0xf0c39a, nose: 0x7d4a3a,
      hoof: 0x3a2417, eye: 0x101010, innerEar: 0xf2b79c,
      tailTuft: 0xf1cf94,
    },
  },
  {
    id: 'alien',
    name: 'Green Alien',
    blurb: "Zoë's hand-painted birthday cow. Out of this world.",
    unlocked: true,
    colors: {
      body: 0x5cbf45, fringe: 0x8ad865, belly: 0x74cc58,
      horn: 0xe6f3d4, hornTip: 0xffffff,
      snout: 0xf5877f, nose: 0xd95a6a,
      hoof: 0x141414, eye: 0x0a0a0a, innerEar: 0xf5877f,
      tailTuft: 0x8ad865,
    },
  },
  {
    id: 'midnight',
    name: 'Midnight Moo',
    blurb: 'A cow the colour of the Wolf Hollow sky. Loves mushrooms.',
    unlocked: false,
    unlockCharm: 'moonstone',
    colors: {
      body: 0x2f3252, fringe: 0x6a6fa8, belly: 0x444a78,
      horn: 0xd8dcf0, hornTip: 0xffffff,
      snout: 0x9a9ad0, nose: 0x5a5a8a,
      hoof: 0x15161f, eye: 0xf3f3ff, innerEar: 0xb0a0e0,
      tailTuft: 0x6a6fa8,
    },
  },
  {
    id: 'strawberry',
    name: 'Strawberry Milk',
    blurb: 'Pink, sweet, and surprisingly strong.',
    unlocked: false,
    unlockCharm: 'blossom',
    colors: {
      body: 0xf28ab2, fringe: 0xffd6e6, belly: 0xf7b3cd,
      horn: 0xfff0f5, hornTip: 0xffffff,
      snout: 0xffc9d6, nose: 0xc4526f, 
      hoof: 0x5a2a3a, eye: 0x1a1a1a, innerEar: 0xffb3c8,
      tailTuft: 0xffd6e6,
    },
  },
  {
    id: 'snowdrop',
    name: 'Snowdrop',
    blurb: 'A fluffy white cow from the high, cold hills.',
    unlocked: false,
    unlockCharm: 'frost',
    colors: {
      body: 0xf4f1ea, fringe: 0xffffff, belly: 0xe6e1d6,
      horn: 0xc9c0ae, hornTip: 0xe8e2d4,
      snout: 0xf2c6c0, nose: 0x8a5a58,
      hoof: 0x3a3230, eye: 0x101010, innerEar: 0xf3b6b0,
      tailTuft: 0xffffff,
    },
  },
];

export function getSkin(id) {
  return SKINS.find((s) => s.id === id) ?? SKINS[0];
}
