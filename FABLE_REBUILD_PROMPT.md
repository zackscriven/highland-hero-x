# Highland Hero X — Fable 5.1 Rebuild Prompt

> **How to use this file:** Open a fresh Claude Code session in this project folder (`/Users/zackscriven/Documents/Highland Hero`), set the model to Fable 5.1 (`/model claude-fable-5-1`), then paste the prompt block below as your first message. Fable will read this whole file for context before touching any code.

---

## Paste this as your first message to Fable 5.1

```text
You are the lead game engineer and technical director rebuilding this project from the
ground up. Read this entire file (FABLE_REBUILD_PROMPT.md) before writing any code, then
also skim the existing GAME_BUILD_PLAN.md and the current src/ tree so you understand what
already exists — you have full permission to replace, restructure, or delete any of it if
a cleaner design serves the vision better. Nothing here is precious. Preserve nothing for
its own sake; preserve the fun.

You are free to use every capability available to you as an agentic coding model to get
this right, including:
- Multi-file, multi-step autonomous editing across the whole codebase, not just patches.
- Planning the architecture yourself before writing code, and revising that plan if a
  better approach reveals itself mid-build.
- Writing and running quick local tests/checks (e.g. a headless build, lint, or a
  scripted smoke test) to verify each phase actually works before moving to the next.
- Searching the web for current Three.js / Vite best practices, performance patterns,
  or known pitfalls if you're unsure — this game should feel smooth on a normal laptop.
- Generating or scaffolding placeholder art (simple geometric/low-poly shapes, gradients,
  procedural textures) rather than depending on external asset packs, unless you flag
  that a specific asset would meaningfully improve the experience.
- Using git for checkpointing your own progress (init a repo if useful) so the rebuild is
  reversible and each working milestone is a real commit.

Work in PHASES. After each phase, stop, run the dev server, confirm the game still boots
and is playable, and give me a short summary: what you built, how to run/test it, and
what's next. Do not silently skip ahead.

Read the full creative and technical brief below before starting Phase 1.
```

---

## 1. Project identity

**Title:** Highland Hero X
*(X = 10 — this is a rebuild made for Zoë's 10th birthday. She had a Highland-cow-themed
10th birthday party where all her friends painted their own ceramic Highland cow figurines
— including a green "alien cow" one Zoë made herself. That's canon now.)*

**Version scheme going forward:**
- `V10` — this rebuild. Ground-up rewrite, single-device split-screen 2-player.
- `V10.2` — planned fast-follow: simple local-network multiplayer (see §5).

Keep a `CHANGELOG.md` and tag versions accordingly so progress is visible.

## 2. Core vision (carry forward from the original build plan, improve freely)

You play a young Highland cow in a cozy, warm grassland. Wander too far and you enter
**Wolf Hollow** — a cute-scary badlands with wolves, bears, hazards, and a **three-headed
wolf** final boss. The cow starts weak and has to flee danger, then trains and unlocks
abilities (Headbutt, Stampede Charge, Horn Shield, Moo Blast, Grass Power) to eventually
stand and fight.

Vibe: Stardew Valley coziness meets a kid-friendly spooky badlands. Low-poly 3D,
warm grassland colors, charming animals. **No gore, no real horror, no jump scares** —
Zoë is the target audience and the toughest critic.

Camera: fixed-angle 3D top-down/isometric, following the player — think cozy farming-game
or simple 3D Pokémon-style camera.

## 3. Give the game a real core mission (this was missing before — fix it)

Right now "explore until you can beat the boss" isn't a strong enough hook. Design and
implement an actual objective structure, for example (adapt as you see fit, but land on
something concrete):

- **The Grasslands are losing their color/magic** because the three-headed wolf has stolen
  the herd's **Highland Charms** (collectibles scattered through the world and guarded in
  Wolf Hollow).
- Collecting Charms is how the player unlocks new abilities and new cow skins (see §4) —
  progression is tied to the objective, not just a level-up counter.
- A visible objective/quest tracker in the UI (e.g. "3 / 7 Highland Charms recovered") so
  a 10-year-old always knows what to do next and how close she is to the boss fight.
- A clear win state: recover enough Charms, grow strong enough, defeat the three-headed
  wolf, restore the grasslands. Give it a proper ending moment — this game should have a
  finish line worth celebrating.

## 4. Cow skins — in-game selector menu

Build a simple character-select / skin-selector screen shown before a run starts (or
accessible from a pause menu). Skins swap the cow's color/texture on the same base model
— no need for separate rigs or animations per skin.

Ship with at least:
1. **Classic Highland** — the traditional shaggy orange/tan Highland cow. Default.
2. **Green Alien** — Zoë's actual 10th-birthday paint job: green body, black hooves, a
   pink/coral snout, and small black eyes. Reference the vibe of a kid's hand-painted
   ceramic figurine — bright, a little goofy, charming, not scary-alien.

Leave the skin system data-driven (a simple config/array of `{id, name, colors, unlocked}`)
so more themes are trivial to add later — this is meant to grow over time as a fun
running feature, not a one-off.

## 5. Two-player mode

**V10 (this rebuild):** Same-device split screen, single browser window/process.
- Two independent camera viewports (e.g. top/bottom or left/right split), each following
  its own character.
- Player 1 (the cow): **WASD** movement/controls.
- Player 2 (Zoë): **Arrow keys** movement/controls.
- Keep input handling cleanly separated per-player from the start (a generic `InputMap`
  per player rather than hardcoded key checks scattered through the code) — this makes
  the V10.2 network upgrade much easier later.
- Decide and implement what Player 2 actually *does* — e.g. Zoë could play as a second
  cow, a helper character, or something thematically fun tied to the birthday-party
  framing (multiple kids each got their own cow). Your call — pick something that makes
  local co-op genuinely fun, not just "same character twice."
- 2-player mode should be optional — the game must still fully work single-player.

**V10.2 (roadmap only — do not build yet, just leave the architecture ready for it):**
Add a simple local-network mode, similar in spirit to a local Minecraft LAN world:
one machine runs a small local server, other devices on the same wifi (a tablet, another
laptop) open the game in a browser and join. Note this as a clearly scoped follow-up
phase in `CHANGELOG.md`/`GAME_BUILD_PLAN.md` once V10 is stable — don't start it until
V10's split-screen mode is solid and asked for.

## 6. Technical rebuild guidance

- Stack: keep Vite + Three.js unless you find a concrete reason a different approach
  (e.g. a lighter renderer, a different state-management pattern) would meaningfully
  improve performance or maintainability for a browser game of this scope — if you switch,
  explain why in your phase summary.
- Prioritize: clean separation of game state / rendering / input / UI, a stable 60fps
  target on a normal laptop, and code simple enough that a small team (or a curious kid
  looking over Dad's shoulder) can follow what's happening.
- No account system, no backend, no telemetry, nothing that leaves the local machine —
  this is a local, offline, kid-safe game. It runs via `npm run dev` and that's it.
- Confirm the production build (`npm run build` / `npm run preview`) still works at the
  end, not just the dev server.

## 7. Phased delivery (adapt as needed, but keep checkpoints)

1. **Foundation** — fresh project skeleton, core loop, camera, movement, basic world.
2. **Objective system** — Highland Charms, quest tracker UI, progression hooks.
3. **Abilities & combat** — ability unlocks tied to progression, Wolf Hollow enemies.
4. **Skin selector** — Classic Highland + Green Alien, selectable pre-game.
5. **Split-screen 2-player** — dual viewport, WASD vs arrow keys, verify both playable.
6. **Boss fight & win state** — three-headed wolf, ending moment.
7. **Polish pass** — performance check, bug pass, update CHANGELOG.md, tag as V10.

At the end of Phase 7, give a final summary of how to run it, how to play 1P and 2P, and
what V10.2 (local network multiplayer) will need architecturally when we're ready for it.
```
