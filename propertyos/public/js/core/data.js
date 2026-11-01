// Screen data: fetch once, keep the last copy in S.data, tell the shell when it changes.
import { S, emit } from './store.js';
import { load, refreshMe } from './api.js';

const PATHS = {
  rent: () => '/rent',
  myrent: () => '/my/rent',
  tickets: () => '/tickets',
  visitors: () => '/visitors',
  props: () => '/properties',
  guard: () => (gateProperty() ? `/guard/overview?property_id=${encodeURIComponent(gateProperty())}` : null),
};

const KEYS_BY_ROLE = {
  landlord: ['rent', 'tickets', 'visitors'],
  tenant: ['myrent', 'tickets', 'visitors'],
  guard: ['guard'],
};

export function gateProperty() {
  const me = S.me;
  if (!me) return '';
  const list = gateProperties();
  const pick = S.prefs.gateProp;
  return list.find((p) => p.id === pick) ? pick : (list[0] && list[0].id) || '';
}

/** Properties where this person can run the gate: guard assignments, plus properties they own. */
export function gateProperties() {
  const me = S.me;
  if (!me) return [];
  const seen = new Map();
  for (const p of me.guard_properties || []) seen.set(p.id, p);
  for (const p of me.properties || []) if (!seen.has(p.id)) seen.set(p.id, p);
  return [...seen.values()];
}

export async function refreshData(keys) {
  const list = keys || KEYS_BY_ROLE[S.role] || [];
  await Promise.all(list.map(async (k) => {
    const path = PATHS[k]();
    if (!path) return;
    try {
      const { data, stale } = await load(path);
      S.data[k] = { data, stale };
    } catch (e) {
      if (!S.data[k]) S.data[k] = { data: null, error: e };
    }
  }));
  emit('data');
}

export async function refreshAll() {
  try { await refreshMe(); } catch { /* offline: keep what we have */ }
  await refreshData();
}

export function clearData() {
  S.data = {};
}

export const dataOf = (k) => (S.data[k] && S.data[k].data) || null;
