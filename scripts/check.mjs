// Quick static sanity checks for the pure (non-WebGL) modules. Run: npm run check
import assert from 'node:assert/strict';

const { zoneAt, ZONES } = await import('../src/data/zones.js');
const { SKINS, getSkin } = await import('../src/data/skins.js');
const { InputMap, P1_BINDINGS, P2_BINDINGS, SOLO_BINDINGS, ACTIONS } = await import('../src/core/InputMap.js');
const { clamp, damp, angleDamp, mulberry32 } = await import('../src/core/math.js');

// Zones tile the Z axis with no gaps.
assert.equal(zoneAt(100).key, 'meadow');
assert.equal(zoneAt(0).key, 'grove');
assert.equal(zoneAt(-50).key, 'hollow');
assert.equal(zoneAt(-120).key, 'arena');
assert.equal(ZONES.meadow.zMin, ZONES.grove.zMax);
assert.equal(ZONES.grove.zMin, ZONES.hollow.zMax);
assert.equal(ZONES.hollow.zMin, ZONES.arena.zMax);

// Skins: unique ids, full colour sets, defaults unlocked.
const ids = new Set(SKINS.map((s) => s.id));
assert.equal(ids.size, SKINS.length, 'skin ids must be unique');
assert.ok(getSkin('classic').unlocked && getSkin('alien').unlocked, 'classic + alien must start unlocked');
for (const s of SKINS) for (const k of ['body', 'fringe', 'horn', 'snout', 'hoof', 'eye']) assert.ok(s.colors[k] !== undefined, `${s.id} missing ${k}`);

// Input maps: every action bound, P1/P2 never share a key.
for (const a of ACTIONS) { assert.ok(P1_BINDINGS[a]?.length); assert.ok(P2_BINDINGS[a]?.length); assert.ok(SOLO_BINDINGS[a]?.length >= 2); }
const p1 = new Set(Object.values(P1_BINDINGS).flat());
for (const c of Object.values(P2_BINDINGS).flat()) assert.ok(!p1.has(c), `P1 and P2 both use ${c}`);

const fakeKb = { down: new Set(['KeyW', 'KeyD']), isDown(c) { return this.down.has(c); }, wasPressed() { return false; } };
const im = new InputMap(fakeKb, P1_BINDINGS);
const mv = im.moveVector();
assert.ok(Math.abs(Math.hypot(mv.x, mv.z) - 1) < 1e-6 && mv.z < 0 && mv.x > 0);

// Math helpers.
assert.equal(clamp(5, 0, 3), 3);
assert.ok(Math.abs(damp(0, 10, 5, 10) - 10) < 0.01);
assert.ok(Math.abs(angleDamp(3.0, -3.0, 100, 1) - 3.2831853) < 0.01, 'angleDamp takes the short way round');
const r1 = mulberry32(7), r2 = mulberry32(7);
assert.equal(r1(), r2(), 'seeded rng is deterministic');

console.log('check.mjs: all good ✔');
