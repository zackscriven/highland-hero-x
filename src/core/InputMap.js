// Per-player input mapping. Every player gets their own InputMap so the game
// logic never checks raw key codes — it asks "is this player's `headbutt` down?".
//
// V10.2 note: a networked player will get a NetworkInput with the same
// isDown / wasPressed / moveVector interface, fed from packets instead of keys.

export const ACTIONS = [
  'up', 'down', 'left', 'right',
  'sprint', 'headbutt', 'charge', 'shield', 'moo', 'grass',
];

export const P1_BINDINGS = {
  up: ['KeyW'], down: ['KeyS'], left: ['KeyA'], right: ['KeyD'],
  sprint: ['ShiftLeft'],
  headbutt: ['Space'],
  charge: ['KeyE'],
  shield: ['KeyQ'],
  moo: ['KeyF'],
  grass: ['KeyR'],
};

export const P2_BINDINGS = {
  up: ['ArrowUp'], down: ['ArrowDown'], left: ['ArrowLeft'], right: ['ArrowRight'],
  sprint: ['ShiftRight'],
  headbutt: ['Slash'],
  charge: ['Period'],
  shield: ['Comma'],
  moo: ['KeyM'],
  grass: ['KeyN'],
};

// Solo play accepts both clusters so either kid can play alone with their favourite keys.
export const SOLO_BINDINGS = Object.fromEntries(
  ACTIONS.map((a) => [a, [...P1_BINDINGS[a], ...P2_BINDINGS[a]]])
);

export const KEY_LABELS = {
  KeyW: 'W', KeyA: 'A', KeyS: 'S', KeyD: 'D', KeyE: 'E', KeyQ: 'Q', KeyF: 'F', KeyR: 'R',
  KeyM: 'M', KeyN: 'N', Space: 'Space', ShiftLeft: 'Shift', ShiftRight: 'R-Shift',
  Slash: '/', Period: '.', Comma: ',',
  ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→',
};

export class InputMap {
  constructor(keyboard, bindings) {
    this.kb = keyboard;
    this.bindings = bindings;
  }

  isDown(action) {
    const codes = this.bindings[action];
    if (!codes) return false;
    for (const c of codes) if (this.kb.isDown(c)) return true;
    return false;
  }

  wasPressed(action) {
    const codes = this.bindings[action];
    if (!codes) return false;
    for (const c of codes) if (this.kb.wasPressed(c)) return true;
    return false;
  }

  // Normalized movement in world XZ. -Z is "up" on screen (north).
  moveVector() {
    let x = 0, z = 0;
    if (this.isDown('up')) z -= 1;
    if (this.isDown('down')) z += 1;
    if (this.isDown('left')) x -= 1;
    if (this.isDown('right')) x += 1;
    const len = Math.hypot(x, z);
    if (len > 0) { x /= len; z /= len; }
    return { x, z, moving: len > 0 };
  }

  // Human-readable key for HUD hints, e.g. label('headbutt') → "Space".
  label(action) {
    const code = this.bindings[action]?.[0];
    return KEY_LABELS[code] ?? code ?? '?';
  }

  moveLabel() {
    return ['up', 'left', 'down', 'right'].map((a) => this.label(a)).join('');
  }
}
