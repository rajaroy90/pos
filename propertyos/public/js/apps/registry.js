// App registry. Modules load on first use so the first screen stays small.
export const APP_DEFS = {
  rent: { icon: 'rent', cls: 'rent', label: 'app.rent', load: () => import('./rent.js') },
  repairs: { icon: 'wrench', cls: 'repairs', label: 'app.repairs', load: () => import('./repairs.js') },
  visitors: { icon: 'qr', cls: 'visitors', label: 'app.visitors', load: () => import('./visitors.js') },
  properties: { icon: 'building', cls: 'properties', label: 'app.properties', load: () => import('./properties.js') },
  gate: { icon: 'scan', cls: 'gate', label: 'app.gate', load: () => import('./gate.js') },
  settings: { icon: 'sliders', cls: 'settings', label: 'app.settings', load: () => import('./settings.js') },
  join: { icon: 'key', cls: 'join', label: 'app.join', load: () => import('./join.js') },
};

export async function launch(id, params = {}) {
  const def = APP_DEFS[id];
  if (!def) return null;
  const mod = await def.load();
  return mod.open(params);
}
