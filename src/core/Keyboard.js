// Global keyboard state. One instance is shared by every InputMap.
// Tracks held keys plus "pressed this frame" edges; call endFrame() once per tick.

const PREVENT_DEFAULT = new Set([
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Slash', 'Period', 'Comma',
]);

export class Keyboard {
  constructor(target = window) {
    this.down = new Set();
    this.pressed = new Set();
    this.enabled = true;

    target.addEventListener('keydown', (e) => {
      if (PREVENT_DEFAULT.has(e.code)) e.preventDefault();
      if (!this.enabled) return;
      if (!e.repeat) this.pressed.add(e.code);
      this.down.add(e.code);
    });
    target.addEventListener('keyup', (e) => this.down.delete(e.code));
    window.addEventListener('blur', () => this.clear());
  }

  isDown(code) { return this.down.has(code); }
  wasPressed(code) { return this.pressed.has(code); }

  clear() { this.down.clear(); this.pressed.clear(); }

  // Call at the very end of each frame so edge-presses last exactly one tick.
  endFrame() { this.pressed.clear(); }
}
