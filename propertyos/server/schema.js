// Versioned migrations applied automatically on first request (see db.js).
// To change the schema later, APPEND a new entry. Never edit an old one.
export const MIGRATIONS = [
  `
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  role_hint TEXT NOT NULL DEFAULT 'landlord',
  key_hash TEXT NOT NULL,
  key_salt TEXT NOT NULL,
  lang TEXT NOT NULL DEFAULT 'en',
  is_demo INTEGER NOT NULL DEFAULT 0,
  demo_group TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_users_demo ON users(is_demo, created_at);
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  last_seen INTEGER NOT NULL,
  ua TEXT NOT NULL DEFAULT ''
);
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE TABLE consents (
  user_id TEXT NOT NULL,
  version TEXT NOT NULL,
  at INTEGER NOT NULL
);
CREATE TABLE recovery (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  kind TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX idx_recovery_user ON recovery(user_id);
CREATE TABLE properties (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  name TEXT NOT NULL,
  address TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  upi_id TEXT NOT NULL DEFAULT '',
  upi_name TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_properties_owner ON properties(owner_id);
CREATE TABLE units (
  id TEXT PRIMARY KEY,
  property_id TEXT NOT NULL,
  label TEXT NOT NULL,
  rent INTEGER NOT NULL DEFAULT 0,
  deposit INTEGER NOT NULL DEFAULT 0,
  due_day INTEGER NOT NULL DEFAULT 5,
  start_month TEXT NOT NULL,
  tenant_id TEXT,
  tenant_name TEXT NOT NULL DEFAULT '',
  tenant_phone TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_units_property ON units(property_id);
CREATE INDEX idx_units_tenant ON units(tenant_id);
CREATE TABLE invites (
  code_hash TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  property_id TEXT NOT NULL,
  unit_id TEXT,
  created_by TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  used_by TEXT,
  used_at INTEGER
);
CREATE TABLE members (
  user_id TEXT NOT NULL,
  property_id TEXT NOT NULL,
  role TEXT NOT NULL,
  PRIMARY KEY (user_id, property_id, role)
);
CREATE TABLE payments (
  id TEXT PRIMARY KEY,
  unit_id TEXT NOT NULL,
  property_id TEXT NOT NULL,
  period TEXT NOT NULL,
  amount INTEGER NOT NULL,
  method TEXT NOT NULL,
  status TEXT NOT NULL,
  utr TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  created_by TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  decided_by TEXT,
  decided_at INTEGER,
  receipt_no TEXT,
  reject_reason TEXT NOT NULL DEFAULT ''
);
CREATE INDEX idx_payments_unit ON payments(unit_id, period);
CREATE INDEX idx_payments_property ON payments(property_id, status);
CREATE TABLE tickets (
  id TEXT PRIMARY KEY,
  property_id TEXT NOT NULL,
  unit_id TEXT NOT NULL,
  created_by TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'other',
  urgency TEXT NOT NULL DEFAULT 'normal',
  status TEXT NOT NULL DEFAULT 'open',
  vendor_name TEXT NOT NULL DEFAULT '',
  vendor_phone TEXT NOT NULL DEFAULT '',
  has_photo INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX idx_tickets_property ON tickets(property_id, status);
CREATE INDEX idx_tickets_unit ON tickets(unit_id);
CREATE TABLE ticket_events (
  id TEXT PRIMARY KEY,
  ticket_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  text TEXT NOT NULL DEFAULT '',
  at INTEGER NOT NULL
);
CREATE INDEX idx_ticket_events ON ticket_events(ticket_id, at);
CREATE TABLE ticket_photos (
  ticket_id TEXT PRIMARY KEY,
  data TEXT NOT NULL
);
CREATE TABLE visitors (
  id TEXT PRIMARY KEY,
  property_id TEXT NOT NULL,
  unit_id TEXT NOT NULL,
  host_id TEXT,
  name TEXT NOT NULL,
  purpose TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL,
  code TEXT NOT NULL,
  valid_from INTEGER NOT NULL,
  valid_to INTEGER NOT NULL,
  max_uses INTEGER NOT NULL DEFAULT 1,
  uses INTEGER NOT NULL DEFAULT 0,
  by_guard INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  last_used_at INTEGER
);
CREATE INDEX idx_visitors_property ON visitors(property_id, status);
CREATE INDEX idx_visitors_host ON visitors(host_id);
CREATE TABLE visit_log (
  id TEXT PRIMARY KEY,
  visitor_id TEXT,
  property_id TEXT NOT NULL,
  at INTEGER NOT NULL,
  guard_id TEXT NOT NULL,
  result TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT ''
);
CREATE INDEX idx_visit_log ON visit_log(property_id, at);
CREATE TABLE notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  data TEXT NOT NULL DEFAULT '{}',
  ref TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  read_at INTEGER
);
CREATE INDEX idx_notifications_user ON notifications(user_id, created_at);
CREATE TABLE rl (
  key TEXT PRIMARY KEY,
  window_start INTEGER NOT NULL,
  count INTEGER NOT NULL
);
`,
  // 2: tenant privacy across tenancies, rent history, payment name snapshot
  `
ALTER TABLE units ADD COLUMN tenant_since INTEGER NOT NULL DEFAULT 0;
ALTER TABLE units ADD COLUMN rent_hist TEXT NOT NULL DEFAULT '[]';
ALTER TABLE payments ADD COLUMN tenant_name TEXT NOT NULL DEFAULT '';
CREATE INDEX idx_payments_unit_created ON payments(unit_id, created_at);
CREATE INDEX idx_tickets_unit_created ON tickets(unit_id, created_at);
`,
];
