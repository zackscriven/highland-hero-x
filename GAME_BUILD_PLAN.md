# Highland Hero: Wolf Hollow — Weekend Game Build Plan

## Initial Claude Code Prompt

Copy and paste this prompt into Claude Code after placing this file in the project root as:

`GAME_BUILD_PLAN.md`

```text
You are the senior software architect and lead game engineer for this project.

Read the file `GAME_BUILD_PLAN.md` completely before writing code.

Your job is to build the game described in that file as a weekend MVP using Vite + Three.js. Work step by step. Do not skip ahead. After each step, make sure the game still runs locally and the code stays clean.

Core goals:
- Keep the game fun, cute-scary, and playable.
- Keep the code simple enough for a small team to understand.
- Avoid unnecessary complexity.
- Avoid external 3D assets for the MVP unless explicitly requested later.
- Build the game in phases so we always have a working version.

Start with Step 1: Project Setup.

After Step 1 is complete, pause and summarize:
1. What you built
2. How to run it
3. What files you created
4. What the next step is
```

---

# Game Vision

## Working Title

**Highland Hero: Wolf Hollow**

## Core Concept

You play as a young Highland cow in a beautiful grassland world. At the beginning, everything feels safe, warm, and peaceful.

But if you wander too far, you enter **Wolf Hollow**, a cute-scary badlands area filled with wolves, bears, dirty ponds, poisonous food, and a final boss: a **three-headed wolf**.

At first, the Highland cow is weak and has to run away from danger.

Over time, the cow learns new abilities:

- Headbutt
- Stampede Charge
- Horn Shield
- Moo Blast
- Grass Power

The player trains, survives, grows stronger, fights enemies, and eventually defeats the three-headed wolf to save the grasslands.

## Vibe

Cute-scary, cozy, slightly mysterious.

Think:

- Stardew Valley mood
- Low-poly 3D
- Warm grassland colors
- Spooky but kid-friendly badlands
- Charming animals
- No gore
- No horror jump scares

## Camera Style

3D top-down / isometric.

The camera should be fixed at an angle and follow the player, similar to a simple 3D Pokémon or cozy farming game view.

## Build Target

Weekend MVP.

The goal is not a massive open-world game. The goal is a small, polished, playable browser game that can run on a MacBook and be shared quickly.

Recommended stack:

- Vite
- Three.js
- JavaScript or TypeScript
- Simple collisions using distance checks and bounding boxes
- No complicated physics engine for MVP

---

# MVP Game Loop

1. Player spawns in the Safe Meadow as a young Highland cow.
2. Player explores and learns by interacting with the world.
3. Hunger and thirst slowly decrease.
4. Player must find clean water and safe food.
5. Dirty water and poisonous/rotten food cause food poisoning:
   - Player slows down
   - Health slowly decays for a while
   - UI shows poison/food poisoning status
6. Player discovers training spots.
7. Training unlocks abilities over time.
8. Player enters Wolf Hollow.
9. Player fights wolves and bears.
10. Player reaches the boss arena.
11. Player fights the three-headed wolf.
12. Player wins and saves the grasslands.

---

# Core Player Stats

The player should have:

- Health
- Hunger
- Thirst
- Strength
- Stamina
- Courage
- Ability unlocks
- Food poisoning status

## Stat Behavior

Health:
- Reaches zero = game over.
- Decays if hunger or thirst reaches zero.
- Decays while food poisoning is active.

Hunger:
- Slowly decreases over time.
- Restored by safe food.
- Not restored by rotten or poisonous food.

Thirst:
- Slowly decreases over time.
- Restored by clean water.
- Not restored by dirty water.

Strength:
- Increases headbutt and charge damage.

Stamina:
- Controls sprint and Stampede Charge.

Courage:
- Unlocks deeper access into Wolf Hollow and the boss arena.

Food Poisoning:
- Triggered by dirty water or bad food.
- Temporarily slows the player.
- Causes health to decay slowly for a limited time.

---

# Ability Progression

The cow should learn all abilities over time.

## Ability 1: Headbutt

Unlocked early.

Input:
- Spacebar

Purpose:
- Basic close-range attack.
- Damages wolves, bears, and boss.

## Ability 2: Stampede Charge

Unlocked after stamina training.

Input:
- Shift + Spacebar, or another simple key if easier.

Purpose:
- Fast forward dash.
- Uses stamina.
- Deals more damage than headbutt.
- Can help escape danger.

## Ability 3: Horn Shield

Unlocked after courage/strength training.

Input:
- Hold right mouse button, Q, or another easy key.

Purpose:
- Reduces incoming damage.
- Useful against bears and boss attacks.

## Ability 4: Moo Blast

Unlocked later in Wolf Hollow.

Input:
- F

Purpose:
- Short-range circular shockwave.
- Pushes small enemies back.
- Does light damage.
- Should feel funny and cute.

## Ability 5: Grass Power

Unlocked before the boss fight.

Input:
- R

Purpose:
- Healing / nature power.
- Restores some health if the player has enough energy.
- Could create a temporary patch of safe grass.

For the MVP, each ability can be simple. Prioritize fun and readability over complex systems.

---

# World Zones

## Zone 1: Safe Meadow

Purpose:
- Starting area.
- Pretty, peaceful, safe.
- Teaches movement and interaction naturally.

Visuals:
- Green grass
- Flowers
- Soft hills
- Trees
- Clean lake
- Good food patches

Enemies:
- None or one harmless tutorial creature.

Interactions:
- Drink clean water
- Eat safe food
- Discover first training spot

## Zone 2: Training Grove

Purpose:
- Teaches progression.
- Unlocks abilities.

Visuals:
- Trees arranged like a natural training area
- Rocks
- Logs
- A courage bell or wooden training post

Training spots:
- Headbutt Rock
- Sprint Hill
- Horn Post
- Echo Stone
- Ancient Grass Patch

Ability unlock examples:
- Headbutt Rock unlocks/improves Headbutt
- Sprint Hill unlocks Stampede Charge
- Horn Post unlocks Horn Shield
- Echo Stone unlocks Moo Blast
- Ancient Grass Patch unlocks Grass Power

## Zone 3: Wolf Hollow

Purpose:
- Main danger zone.
- Cute-scary badlands.
- Player must survive and fight.

Visuals:
- Darker grass
- Purple/brown ground
- Dead trees
- Thorn bushes
- Fog
- Glowing mushrooms
- Dirty ponds
- Rotten food

Enemies:
- Wolves
- Bears

Hazards:
- Dirty ponds
- Poison berries
- Rotten mushrooms
- Thorn bushes

## Zone 4: Three-Headed Wolf Arena

Purpose:
- Final boss fight.

Visuals:
- Circular arena
- Moonlight
- Large dead tree or stone arch
- Thorn wall around the arena
- Spooky but still charming

Boss:
- Three-headed wolf

Win condition:
- Defeat the boss.

---

# Controls

Recommended controls:

- WASD / Arrow Keys: Move
- Shift: Sprint
- E: Interact
- Spacebar: Headbutt
- Shift + Spacebar: Stampede Charge
- Q: Horn Shield
- F: Moo Blast
- R: Grass Power
- Escape: Pause
- Restart button on win/loss screens

---

# Development Steps

---

## Step 1: Project Setup

```text
We are building a weekend MVP browser game called "Highland Hero: Wolf Hollow."

Use Vite + Three.js with plain JavaScript or TypeScript. Keep the architecture simple, readable, and easy to modify.

Game requirements:
- 3D top-down/isometric browser game
- Player is a Highland cow represented initially with simple low-poly geometry
- WASD and arrow-key movement
- Fixed angled camera following the player
- Low-poly grassland world with a transition into Wolf Hollow
- Cute-scary Stardew Valley-inspired vibe
- No external 3D assets required for MVP
- Use simple collision detection with bounding circles/boxes, not a complex physics engine
- Include health, hunger, thirst, strength, stamina, courage, ability unlocks, and food poisoning status
- Include clean lakes, dirty ponds, good food, rotten/poisonous food, training spots, wolves, bears, and a boss arena
- Spacebar = headbutt attack
- E = interact with food/water/training spots
- Win by defeating the three-headed wolf
- Lose if health reaches zero

Create the initial project structure:
- index.html
- package.json
- src/main.js or src/main.ts
- src/game/Game.js
- src/game/Player.js
- src/game/World.js
- src/game/Input.js
- src/game/UI.js
- src/game/Enemy.js
- src/game/Abilities.js
- src/game/Interactables.js

Build the first playable scene:
- Render a simple world
- Render the cow placeholder
- Allow player movement
- Camera follows the player
- Basic UI appears on screen

After implementation, explain how to run it locally on a MacBook using:
- npm install
- npm run dev
```

---

## Step 2: Player Character and Camera

```text
Now implement the player character and camera.

Requirements:
- Player is a cute low-poly Highland cow placeholder made from simple Three.js shapes.
- Use a rounded body, head, horns, legs, tail, and shaggy hair/fringe if possible using simple geometry.
- The cow should feel charming, not realistic.
- Movement should feel smooth.
- Camera should be fixed at an angled top-down/isometric view and follow the player.
- Player should face movement direction smoothly.
- Add sprinting with Shift.
- Sprinting drains stamina.
- Stamina regenerates when not sprinting.
- Show health, thirst, hunger, strength, stamina, courage, and current unlocked abilities in a simple UI overlay.

Keep the code modular and easy to edit.
Do not add unnecessary systems yet.
```

---

## Step 3: Build the World Zones

```text
Now build the game world.

Requirements:
- Create a large grassland starting area called Safe Meadow.
- Add a natural training area called Training Grove.
- Add a darker cute-scary badlands area called Wolf Hollow.
- Add a final boss arena for the three-headed wolf.

Visual requirements:
- Safe Meadow should feel peaceful, colorful, and cozy.
- Training Grove should feel like a natural practice area.
- Wolf Hollow should feel darker, spooky, and mysterious, but still kid-friendly.
- Boss arena should feel important and dramatic.

Add simple low-poly environmental objects:
- Grass patches
- Flowers
- Trees
- Rocks
- Logs
- Hills
- Dead trees
- Thorn bushes
- Glowing mushrooms
- Clean lakes
- Dirty ponds
- Food patches

Add invisible boundaries so the player cannot walk off the map.

Add visible landmarks so the player understands progression:
1. Safe Meadow
2. Training Grove
3. Wolf Hollow
4. Three-Headed Wolf Arena

Add a zone label to the UI when the player enters each zone.
```

---

## Step 4: Food, Water, and Food Poisoning

```text
Now implement survival mechanics.

Requirements:
- Thirst slowly decreases over time.
- Hunger slowly decreases over time.
- Health decreases if hunger or thirst reaches zero.
- Add clean lakes that restore thirst when the player presses E nearby.
- Add safe food patches that restore hunger when the player presses E nearby.
- Add dirty ponds.
- Add rotten mushrooms or poison berries.
- Dirty ponds and bad food should cause food poisoning.

Food poisoning behavior:
- Player movement speed is reduced for a limited time.
- Health slowly decays while food poisoning is active.
- UI shows a visible "Food Poisoning" or "Poisoned" status.
- Food poisoning eventually wears off.
- Drinking clean water or using Grass Power later may reduce poison duration.

Interaction prompts:
- "Press E to drink clean water"
- "Press E to eat"
- "Dirty water — this could make you sick!"
- "Poison berries — avoid these!"
- "Rotten food — this could make you sick!"

Keep it kid-friendly and readable.
```

---

## Step 5: Training System and Ability Unlocks

```text
Now implement the training system and ability progression.

The cow should learn all abilities over time:
1. Headbutt
2. Stampede Charge
3. Horn Shield
4. Moo Blast
5. Grass Power

Training spots in Training Grove:
- Headbutt Rock
- Sprint Hill
- Horn Post
- Echo Stone
- Ancient Grass Patch

Requirements:
- When the player presses E near a training spot, increase a related stat or unlock an ability.
- Headbutt Rock unlocks Headbutt and increases Strength.
- Sprint Hill unlocks Stampede Charge and increases Stamina.
- Horn Post unlocks Horn Shield and increases Courage/Defense.
- Echo Stone unlocks Moo Blast.
- Ancient Grass Patch unlocks Grass Power.
- Add simple feedback text:
  "+1 Strength"
  "+1 Stamina"
  "+1 Courage"
  "Unlocked: Stampede Charge"
  "Unlocked: Horn Shield"
  "Unlocked: Moo Blast"
  "Unlocked: Grass Power"

Prevent infinite instant training:
- Add cooldowns to training spots.
- Add a max stat cap for the MVP.
- Make the player train several times before feeling strong.

UI:
- Show unlocked abilities.
- Show locked abilities as dimmed or hidden.
- Show current stats.

The goal is:
- Player starts weak.
- Player runs away from danger at first.
- Player trains.
- Player becomes strong enough to fight wolves and bears.
- Player unlocks Grass Power before the boss.
```

---

## Step 6: Ability Implementation

```text
Now implement all player abilities.

Ability 1: Headbutt
- Input: Spacebar
- Short-range attack in front of the cow.
- Damage scales with Strength.
- Has a short cooldown.
- Show a small impact effect.

Ability 2: Stampede Charge
- Input: Shift + Spacebar, or C if that is easier.
- Cow dashes forward.
- Uses stamina.
- Deals more damage than Headbutt if it hits an enemy.
- Can also be used to escape.
- Has a cooldown.

Ability 3: Horn Shield
- Input: Q
- Temporarily reduces incoming damage.
- Uses stamina or has cooldown.
- Show a simple shield visual near the horns.

Ability 4: Moo Blast
- Input: F
- Circular shockwave around cow.
- Pushes small enemies back.
- Deals light damage.
- Has cooldown.
- Add funny/cute visual feedback.

Ability 5: Grass Power
- Input: R
- Restores some health.
- Reduces food poisoning duration if active.
- Optionally creates a small patch of glowing safe grass.
- Has cooldown.
- Should be unlocked late enough that it feels special.

Make abilities simple and reliable.
Prioritize playability over complexity.
```

---

## Step 7: Enemies and Combat

```text
Now add enemies and combat.

Enemies:
- Wolves in Wolf Hollow
- Bears deeper in Wolf Hollow

Wolf behavior:
- Wolves chase the player if close.
- Wolves are faster but weaker.
- Wolves should be scary early but manageable after training.

Bear behavior:
- Bears are slower but stronger.
- Bears have more health.
- Bears hit harder.
- Bears should encourage use of Horn Shield and Stampede Charge.

Combat requirements:
- If enemies touch the player, the player takes damage.
- Player attacks using unlocked abilities.
- Enemies have health.
- Enemies disappear, fall over, or fade out when defeated.
- Add simple visual feedback when damage happens.
- Add floating damage numbers if easy.
- Add enemy health bars if easy.

Difficulty:
- If the player is too weak, enemies should feel dangerous.
- If the player trains, enemies should become beatable.

Keep AI simple:
- Use distance checks.
- Move enemies toward the player.
- No pathfinding needed for MVP.
```

---

## Step 8: Three-Headed Wolf Boss Fight

```text
Now add the final boss fight.

Boss:
- Three-headed wolf
- Located in the Three-Headed Wolf Arena
- Cute-scary, dramatic, and memorable
- Built from simple low-poly geometry for MVP
- Should visibly have three heads if possible

Arena access:
- Player can only enter the boss arena after reaching enough Courage and unlocking enough abilities.
- At minimum, require:
  - Courage above a threshold
  - Grass Power unlocked
  - At least one combat ability beyond Headbutt unlocked

Boss health:
- Boss has much more health than normal enemies.
- Show a boss health bar.

Boss phases:
1. Chase Phase
   - Boss follows player and bites if close.

2. Dash Attack Phase
   - Boss pauses briefly, then lunges forward.
   - Player can dodge or use Horn Shield.

3. Summon Phase
   - Boss summons two small wolves.
   - Player can use Moo Blast to push them away.

4. Final Phase
   - Boss moves faster when low health.
   - Keep it simple but exciting.

Win condition:
- When boss is defeated, show win screen:
  "You saved the grasslands!"

Add a restart button after winning or losing.
```

---

## Step 9: Title Screen, Game Over, and Win Screen

```text
Now add game flow screens.

Title screen:
- Title: "Highland Hero: Wolf Hollow"
- Subtitle: "Train your courage. Save the grasslands."
- Start Game button
- Controls summary
- Cute low-poly visual or animated cow if easy

Game over screen:
- Message: "Wolf Hollow was too much this time..."
- Restart button

Win screen:
- Message: "You saved the grasslands!"
- Secondary text: "The Highland cow became a hero of Wolf Hollow."
- Restart button

Pause screen:
- Escape pauses/unpauses
- Show controls
- Resume button
- Restart button

Make the screens feel cozy and polished.
```

---

## Step 10: Polish Pass

```text
Now do a polish pass while preserving the weekend MVP scope.

Add:
- Nicer lighting
- Shadows if performance is okay
- Low-poly environmental polish
- Floating text feedback for damage, healing, poison, and stat gains
- Simple sound placeholders using Web Audio API if possible:
  - Headbutt sound
  - Stampede sound
  - Shield sound
  - Moo Blast sound
  - Eat/drink sound
  - Poison sound
  - Enemy hit sound
  - Boss roar
  - Win sound
- Zone transition feedback
- Better UI layout
- Ability cooldown indicators
- Simple minimap or compass if easy
- Performance check

Make sure:
- npm run dev works
- npm run build works
- Game does not crash
- Player can win
- Player can lose
- Player can restart
- All abilities are unlockable
- Food poisoning works
- Boss fight works

Do not overcomplicate the game.
Do not add asset pipelines, multiplayer, save systems, inventory systems, or complex quest logic yet.
```

---

# Suggested File Architecture

Use this as a guide. Claude Code can adjust if needed.

```text
src/
  main.js
  game/
    Game.js
    Player.js
    World.js
    Input.js
    UI.js
    Enemy.js
    Boss.js
    Abilities.js
    Interactables.js
    Collision.js
    Constants.js
    Effects.js
    Audio.js
```

## File Responsibilities

### main.js

Starts the app.

### Game.js

Owns:
- Three.js scene
- Renderer
- Camera
- Main game loop
- Game state
- Win/loss state

### Player.js

Owns:
- Cow mesh
- Movement
- Stats
- Ability state
- Damage/healing
- Poison status

### World.js

Owns:
- Terrain
- Zones
- Environment objects
- Boundaries

### Input.js

Owns:
- Keyboard input
- Mouse input if needed

### UI.js

Owns:
- Health/stamina/hunger/thirst display
- Ability display
- Prompt display
- Zone label
- Win/loss/title screens

### Enemy.js

Owns:
- Wolf and bear behavior
- Enemy health
- Enemy movement
- Enemy attacks

### Boss.js

Owns:
- Three-headed wolf
- Boss phases
- Boss health bar
- Boss arena logic

### Abilities.js

Owns:
- Headbutt
- Stampede Charge
- Horn Shield
- Moo Blast
- Grass Power
- Cooldowns

### Interactables.js

Owns:
- Clean water
- Dirty water
- Safe food
- Poison food
- Training spots

### Collision.js

Owns:
- Distance checks
- Bounds checks
- Simple hit detection

### Effects.js

Owns:
- Floating text
- Hit flashes
- Shockwaves
- Poison particles
- Grass Power glow

### Audio.js

Owns:
- Simple Web Audio API sounds

---

# Important Design Rules

## Rule 1: Always Keep It Playable

After every step, the game should still run.

Do not build a huge system and hope it works later.

## Rule 2: Simple Is Better

Use simple:
- Geometry
- Distance checks
- UI
- Enemy AI
- Stat systems

Avoid:
- Complex physics
- Complex asset imports
- Complicated animation trees
- Multiplayer
- Inventory
- Crafting
- Dialogue systems

## Rule 3: Cute-Scary, Not Horror

Wolf Hollow should feel spooky, but not disturbing.

Good:
- Fog
- Purple shadows
- Thorn bushes
- Glowing mushrooms
- Silly wolves
- Dramatic boss

Avoid:
- Gore
- Blood
- Jump scares
- Realistic violence

## Rule 4: Abilities Should Feel Fun Quickly

Each ability should have immediate feedback.

Headbutt:
- Thump effect

Stampede Charge:
- Dust trail

Horn Shield:
- Horn glow or shield ring

Moo Blast:
- Funny circular shockwave

Grass Power:
- Green healing glow

## Rule 5: Zoe Should Be Able to Help Name Things

Leave some easy constants at the top of the code so names can be changed later:

- Cow name
- Meadow name
- Training Grove name
- Wolf Hollow name
- Boss name
- Ability names
- Food names

---

# Stretch Ideas After MVP

Only consider these after the full MVP works.

- Name the cow
- Add collectible flowers
- Add friendly animals
- Add simple quest signs
- Add save/load
- Add mobile controls
- Add custom 3D cow model
- Add animations
- Add music
- Add more zones
- Add more bosses
- Add a cozy home pasture
- Add upgrades
- Add a map
- Add cutscenes

---

# Final MVP Acceptance Criteria

The game is considered MVP complete when:

- It runs in the browser.
- The player controls a Highland cow.
- The camera follows from a fixed 3D angle.
- There is a peaceful meadow.
- There is a spooky Wolf Hollow.
- Hunger and thirst work.
- Clean water and safe food help the player.
- Dirty water and poisonous/rotten food cause food poisoning.
- Food poisoning slows the player and decays health for a while.
- The player can train.
- The player unlocks all five abilities over time.
- Wolves and bears chase and damage the player.
- The player can fight enemies.
- The three-headed wolf boss exists.
- The player can defeat the boss.
- The player can lose.
- The player can restart.
- The game feels cute-scary and fun.
