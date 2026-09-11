// Tiny local save: unlocked skins and last-picked skins. Stays on this machine (localStorage).
const KEY = 'highland-hero-x';

export function loadSave() {
  try { return JSON.parse(localStorage.getItem(KEY)) ?? {}; } catch { return {}; }
}

export function updateSave(patch) {
  const next = { ...loadSave(), ...patch };
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* private mode etc. */ }
  return next;
}

export function unlockedSkinIds() {
  return new Set(loadSave().unlockedSkins ?? []);
}

export function unlockSkin(id) {
  const set = unlockedSkinIds();
  const isNew = !set.has(id);
  set.add(id);
  updateSave({ unlockedSkins: [...set] });
  return isNew;
}

export function isSkinUnlocked(skin) {
  return !!skin.unlocked || unlockedSkinIds().has(skin.id);
}

const DEFAULT_CONFIG = { players: [{ skinId: 'classic', name: 'Player 1' }] };

export function loadConfig() {
  const c = loadSave().config;
  if (!c?.players?.length) return structuredClone(DEFAULT_CONFIG);
  return { players: c.players.slice(0, 2).map((p, i) => ({ skinId: p.skinId ?? 'classic', name: p.name ?? `Player ${i + 1}` })) };
}

export function saveConfig(config) {
  updateSave({ config: { players: config.players.map((p) => ({ skinId: p.skinId, name: p.name })) } });
}
