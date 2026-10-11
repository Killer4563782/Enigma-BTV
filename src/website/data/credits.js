export const ROLE_COLORS = {
  "Creator & Visionary": "#cc88ff",
  "Lead Developer": "#88aaff",
  "Web Developer": "#88ffcc",
  "Builder & Storycrafter": "#ffcc55",
  "Mechanic Designer & Storycrafter": "#ff8855",
  "Builder": "#aaaaff",
  "Contributor": "#c2abeb"
};

export const memberColor = member => member.planetColor || ROLE_COLORS[member.role] || '#c2abeb';
export const isPlanet = member => (member.representation || (member.isCore ? 'planet' : 'star')) === 'planet';
