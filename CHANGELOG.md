# Changelog — Highland Hero X

All notable changes to this project. Versions are git tags (`v10-phase1` … `v10`).

## V10 — 2026-09-11 — "Highland Hero X" ground-up rebuild 🎂

Made for Zoë's 10th birthday. A complete rewrite of the original weekend MVP
(kept in git as `v9-baseline`). Same cozy cute-scary heart, now with a real mission,
two-player split-screen, and Zoë's green alien cow.

### Added
- **Core mission — the Highland Charms.** The Three-Headed Wolf stole the herd's seven
  Charms and the grasslands are losing their colour. Each Charm you recover unlocks an
  ability, a skin, or extra health *for every player*, and visibly brings colour back to
  the meadow. Six Charms open the Thorn Gate; the Wolf keeps the seventh.
- **Quest tracker HUD** with a gem row, a hint for the next Charm, and a per-player
  compass arrow with distance so nobody is ever lost.
- **Skin selector** on the setup screen and in the pause menu. Ships with Classic Highland
  and Zoë's **Green Alien** (green body, black hooves, pink snout, small black eyes) unlocked,
  plus three unlockable skins (Midnight Moo, Strawberry Milk, Snowdrop). Skins are one
  data array in `src/data/skins.js`. Unlocks persist in localStorage only.
- **Two-player split-screen** (left/right). Player 1 = WASD cluster, Player 2 = arrow-key
  cluster, each with their own `InputMap`. Co-op glue: **Herd Bond** (stand together for
  faster stamina and tougher hides) and **nuzzle revives** (walk up to a knocked-out friend
  for two seconds). Grass Power also revives nearby friends.
- **Three-Headed Wolf boss** in the Howling Ring with phases: prowl & bite → telegraphed
  pounce with a vulnerable stumble → howl that summons wolves at 66% / 33% health →
  enraged under 33%. Beaten, it turns out to be three shy pups. Then the Frost Charm appears.
- **Ending moment**: the whole map blooms back to green over three seconds with fireworks,
  then a stats card (time, Charms, wolves bonked, tumbles).
- **Procedural sound effects** via Web Audio (no audio files): moo, thump, charm chimes,
  roar, howl, fanfare. Toggle in the pause menu.
- Healing berries that regrow, enemy drops, thorn bushes that prick, dirty ponds that slow.
- Title → setup → play → pause → win/lose screens. Escape pauses.
- `npm run check` static checks; git tags per phase.

### Changed
- Fresh architecture: `core/` (engine, input, viewport), `data/` (all tuning + names),
  `world/`, `entities/`, `systems/`, `ui/`. Game state, rendering, input, and UI are
  separated so a networked player can slot in later.
- Upgraded to three 0.186 and Vite 8.
- Enemies (wolves fast/weak, bears slow/strong) guard Charms and roam the Hollow, with
  leashes, respawns, sidestep steering, and sprite health bars that work in split-screen.
- Lighting: physically-correct intensities, hemisphere fill, blob shadows instead of shadow
  maps (cheap and split-screen friendly). Ground is one vertex-coloured mesh; flowers and
  grass tufts are instanced.

### Removed
- Hunger/thirst timers and food poisoning from the V9 plan. They added busywork for a
  10-year-old without adding fun; berries, hazards, and the Charm hunt carry the survival
  feel instead.
- Training spots. Abilities now come from Charms so progression and the objective are the
  same thing.

## Roadmap

### V10.2 — Local-network multiplayer (planned, not started)
Same-wifi play like a Minecraft LAN world: one machine hosts, a tablet or second laptop
opens the game in a browser and joins.
- Host runs a tiny Node WebSocket server (`npm run host`) that serves the built game and
  relays input.
- The host stays authoritative: it runs the existing systems and broadcasts a compact
  state snapshot (cows, enemies, boss, charms, effects events) ~20×/s.
- Remote players send `InputMap`-shaped frames (`down` bitmask + `pressed` edges). The
  `InputMap` interface (`isDown / wasPressed / moveVector`) is already the seam.
- A `Viewport` per client renders locally from the snapshot; menus already run on DOM.
- Join flow: host shows its LAN IP + a 4-letter room code on the setup screen.
Do not start until V10 split-screen has been played and enjoyed.

## V9 — 2026-05-02 — original weekend MVP (`v9-baseline`)
Single-player Vite + Three.js prototype: survival stats, five abilities from training spots,
wolves and bears, no boss, no menus. Superseded by V10.
