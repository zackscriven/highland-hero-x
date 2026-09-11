// The seven Highland Charms — the game's core objective.
// Recovering a Charm unlocks its reward for EVERY player (shared progression = better co-op).
// `guards` are spawned by the enemy system (Phase 3). `boss: true` means the boss holds it.

export const CHARMS = [
  { id: 'sunbeam', name: 'Sunbeam Charm', color: 0xffd166, x: -30, z: 66, zone: 'meadow',
    hint: 'Something glimmers beside the meadow lake.',
    rewards: { ability: 'headbutt' } },
  { id: 'hoofprint', name: 'Hoofprint Charm', color: 0xff9f43, x: -26, z: 10, zone: 'grove',
    hint: 'Look to the west side of the Training Grove.',
    rewards: { ability: 'charge' } },
  { id: 'oakheart', name: 'Oakheart Charm', color: 0x8ad865, x: 26, z: 10, zone: 'grove',
    hint: 'Look to the east side of the Training Grove.',
    rewards: { ability: 'shield' } },
  { id: 'echo', name: 'Echo Charm', color: 0x66e0d8, x: -46, z: -38, zone: 'hollow',
    hint: 'Wolves guard it beside a dirty pond in Wolf Hollow.',
    rewards: { ability: 'moo' },
    guards: [{ type: 'wolf', count: 2 }] },
  { id: 'moonstone', name: 'Moonstone Charm', color: 0xb28dff, x: 48, z: -72, zone: 'hollow',
    hint: 'A bear naps beside it, deep in the east of the Hollow.',
    rewards: { ability: 'grass', skin: 'midnight' },
    guards: [{ type: 'bear', count: 1 }, { type: 'wolf', count: 1 }] },
  { id: 'blossom', name: 'Blossom Charm', color: 0xff7ad9, x: -64, z: -84, zone: 'hollow',
    hint: 'Hidden in the far north-west corner of Wolf Hollow.',
    rewards: { skin: 'strawberry', healthMax: 25 },
    guards: [{ type: 'wolf', count: 3 }] },
  { id: 'frost', name: 'Frost Charm', color: 0xe8f6ff, x: 0, z: -124, zone: 'arena',
    hint: 'The Three-Headed Wolf keeps the last Charm in the Howling Ring.',
    rewards: { skin: 'snowdrop' },
    boss: true },
];

export const TOTAL_CHARMS = CHARMS.length;
export const GATE_CHARMS_REQUIRED = 6; // the thorn gate to the arena opens at this count
