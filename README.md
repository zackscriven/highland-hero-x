# Highland Hero X 🐄✨

A cozy, cute-scary low-poly 3D adventure for the browser. You are a young Highland cow.
The Three-Headed Wolf has stolen the herd's **Highland Charms** and the grasslands are
losing their colour. Get them back, grow strong, and face the Wolf in the Howling Ring.

Built with Vite + Three.js. Fully offline, no accounts, nothing leaves your laptop.
Made for Zoë's 10th birthday — the green alien cow is hers.

## Run it

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually http://localhost:5173). Production check:

```bash
npm run build && npm run preview
```

`npm run check` runs quick static tests of the data and input modules.

## How to play

1. **Play** → choose **1 Player** or **2 Players (split-screen)**, name your cows, pick skins.
2. Follow the **compass arrow** and the hint in the quest tracker to each Charm.
3. Charms unlock abilities for everyone: Headbutt → Stampede Charge → Horn Shield →
   Moo Blast → Grass Power. Colour returns to the meadow as you go.
4. Wolf Hollow (north) is dangerous. Wolves are fast, bears hit hard. Eat berries to heal.
   Avoid thorn bushes and dirty ponds.
5. Six Charms open the **Thorn Gate**. Walk into the Howling Ring to wake the Wolf.
   When it crouches and glows, it is about to pounce — dodge or raise your Horn Shield,
   then hit it while it stumbles. Beat it, grab the Frost Charm, and save the grasslands.

**Escape** pauses. The pause menu can swap skins and toggle sound.

### Controls

| Action | Player 1 | Player 2 |
| --- | --- | --- |
| Move | W A S D | ↑ ← ↓ → |
| Sprint | Left Shift | Right Shift |
| Headbutt | Space | / |
| Stampede Charge | E | . |
| Horn Shield | Q | , |
| Moo Blast | F | M |
| Grass Power | R | N |

Solo play accepts both clusters, so either kid can play alone with their favourite keys.

### Two-player tips
- Stay close for **Herd Bond** 💞 (faster stamina, 15% less damage).
- If a friend is knocked out, walk over and stand beside them for two seconds to
  **nuzzle** them back up. Grass Power revives too.
- Charms, abilities, and skin unlocks are shared — teamwork counts.

## Project layout

```
src/
  main.js            boot + error overlay
  Game.js            state machine + wiring of every system
  core/              Engine (renderer, multi-viewport), Keyboard, InputMap, Viewport, math, save
  data/              constants (names & tuning), zones, skins, abilities, charms, enemies
  world/             World builder (terrain, zones, arena, obstacles) + low-poly prop builders
  entities/          Cow, CowMesh, Enemy (wolf/bear), Boss (three-headed wolf), Charm
  systems/           Abilities, Enemies, Quest, Coop, Hazards, Pickups, Effects, Audio
  ui/                Hud, Menus, SetupScreen, styles.css
scripts/check.mjs    static sanity checks
```

Names, colours, and tuning live in `src/data/`. Add a skin by appending to `SKINS`.

See `CHANGELOG.md` for what changed in V10 and the V10.2 (local-network) roadmap.
