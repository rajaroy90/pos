import { all, one } from './db.js';
import { ApiError } from './util.js';

const notFound = () => new ApiError(404, 'not_found', 'Not found');

export async function ownedProperty(db, user, id) {
  const p = await one(db, 'SELECT * FROM properties WHERE id = ? AND owner_id = ?', id, user.id);
  if (!p) throw notFound();
  return p;
}

/** Returns { unit, property, as } where `as` is 'owner' or 'tenant'. Throws 404 otherwise. */
export async function unitAccess(db, user, unitId, { allow = ['owner', 'tenant'] } = {}) {
  const unit = await one(db, 'SELECT * FROM units WHERE id = ?', unitId);
  if (!unit) throw notFound();
  const property = await one(db, 'SELECT * FROM properties WHERE id = ?', unit.property_id);
  if (!property) throw notFound();
  let as = null;
  if (property.owner_id === user.id) as = 'owner';
  else if (unit.tenant_id === user.id) as = 'tenant';
  if (!as || !allow.includes(as)) throw notFound();
  return { unit, property, as };
}

export async function guardPropertyIds(db, user) {
  const rows = await all(db, "SELECT property_id FROM members WHERE user_id = ? AND role = 'guard'", user.id);
  return rows.map((r) => r.property_id);
}

/** Guard (member) or owner of the property. */
export async function gateAccess(db, user, propertyId) {
  const p = await one(db, 'SELECT * FROM properties WHERE id = ?', propertyId);
  if (!p) throw notFound();
  if (p.owner_id === user.id) return p;
  const m = await one(db, "SELECT 1 AS ok FROM members WHERE user_id = ? AND property_id = ? AND role = 'guard'", user.id, propertyId);
  if (!m) throw notFound();
  return p;
}

export async function rolesOf(db, user) {
  const [own, rent, guard] = await Promise.all([
    one(db, 'SELECT COUNT(*) AS n FROM properties WHERE owner_id = ?', user.id),
    one(db, 'SELECT COUNT(*) AS n FROM units WHERE tenant_id = ?', user.id),
    one(db, "SELECT COUNT(*) AS n FROM members WHERE user_id = ? AND role = 'guard'", user.id),
  ]);
  const roles = [];
  if (own.n > 0 || user.role_hint === 'landlord') roles.push('landlord');
  if (rent.n > 0 || user.role_hint === 'tenant') roles.push('tenant');
  if (guard.n > 0) roles.push('guard');
  if (!roles.length) roles.push(user.role_hint === 'guard' ? 'guard' : 'landlord');
  return roles;
}

/** A tenant only sees what happened during their own tenancy (rows created since the previous tenant left). */
export const sinceTenancy = (access, createdAt) => access.as !== 'tenant' || createdAt >= (access.unit.tenant_since || 0);

/** The landlord's one-time reset code is only allowed for accounts that touch nothing else. */
export async function assistedEligible(db, userId) {
  const [owns, rents, guards] = await Promise.all([
    one(db, 'SELECT COUNT(*) AS n FROM properties WHERE owner_id = ?', userId),
    one(db, 'SELECT COUNT(*) AS n FROM units WHERE tenant_id = ?', userId),
    one(db, 'SELECT COUNT(*) AS n FROM members WHERE user_id = ?', userId),
  ]);
  return !(owns.n > 0 || rents.n > 1 || guards.n > 0);
}
