// The five cow abilities, in unlock order. `action` is the InputMap action that triggers it.
export const ABILITIES = [
  { id: 'headbutt', name: 'Headbutt', action: 'headbutt', icon: '🐂', cooldown: 0.7,
    blurb: 'A quick thump with your horns.' },
  { id: 'charge', name: 'Stampede Charge', action: 'charge', icon: '💨', cooldown: 3.0, stamina: 30,
    blurb: 'Dash forward and flatten whatever is in the way.' },
  { id: 'shield', name: 'Horn Shield', action: 'shield', icon: '🛡️', cooldown: 8.0,
    blurb: 'Lower your horns and shrug off most damage for a few seconds.' },
  { id: 'moo', name: 'Moo Blast', action: 'moo', icon: '📣', cooldown: 5.0,
    blurb: 'One mighty MOO that sends enemies flying.' },
  { id: 'grass', name: 'Grass Power', action: 'grass', icon: '🌱', cooldown: 16.0,
    blurb: 'Nature heals you and any friend standing close.' },
];

export const ABILITY_BY_ID = Object.fromEntries(ABILITIES.map((a) => [a.id, a]));
