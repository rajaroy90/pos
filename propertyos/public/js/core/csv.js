// Small CSV reader for importing flats. Handles quotes, commas, semicolons, tabs and a leading BOM (Excel "Save as CSV").
export function parseCSV(text) {
  text = String(text).replace(/^﻿/, '');
  const first = text.split(/\r?\n/, 1)[0] || '';
  const counts = { ',': (first.match(/,/g) || []).length, ';': (first.match(/;/g) || []).length, '\t': (first.match(/\t/g) || []).length };
  const delim = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][1] > 0 ? Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0] : ',';
  const rows = []; let row = []; let cell = ''; let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c;
    } else if (c === '"') q = true;
    else if (c === delim) { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell); cell = ''; if (row.some((x) => x.trim() !== '')) rows.push(row); row = []; }
    else cell += c;
  }
  row.push(cell);
  if (row.some((x) => x.trim() !== '')) rows.push(row);
  return rows.map((r) => r.map((x) => x.trim()));
}

const SYN = {
  label: ['unit', 'flat', 'flat no', 'flat number', 'unit no', 'unit number', 'room', 'label', 'house', 'house no', 'shop'],
  rent: ['rent', 'monthly rent', 'rent amount', 'amount'],
  deposit: ['deposit', 'security deposit', 'advance'],
  due_day: ['due day', 'due_day', 'due', 'rent due day', 'due date'],
  tenant_name: ['tenant', 'tenant name', 'tenant_name', 'name', 'resident'],
  tenant_phone: ['phone', 'mobile', 'tenant phone', 'tenant_phone', 'contact', 'phone number', 'mobile number'],
  start_month: ['start', 'start month', 'start_month', 'since', 'from'],
};
const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9_ ]/g, ' ').replace(/\s+/g, ' ').trim();

/** Turn parsed rows into flats. Returns { units, errors, columns }. */
export function rowsToUnits(rows) {
  if (!rows.length) return { units: [], errors: ['empty'], columns: [] };
  const head = rows[0].map(norm);
  const idx = {};
  for (const [field, names] of Object.entries(SYN)) {
    const i = head.findIndex((h) => names.includes(h));
    if (i >= 0) idx[field] = i;
  }
  let body = rows.slice(1);
  if (idx.label === undefined) { // no header row: assume order unit, rent, tenant, phone
    body = rows;
    Object.assign(idx, { label: 0, rent: 1, tenant_name: 2, tenant_phone: 3 });
  }
  const units = []; const errors = [];
  body.forEach((r, n) => {
    const line = n + 2;
    const get = (f) => (idx[f] !== undefined ? (r[idx[f]] || '') : '');
    const label = get('label');
    if (!label) { errors.push({ line, key: 'csv.err_label' }); return; }
    const num = (v) => Number(String(v).replace(/[^\d.]/g, '')) || 0;
    const u = { label: label.slice(0, 30), rent: Math.round(num(get('rent'))), deposit: Math.round(num(get('deposit'))), tenant_name: get('tenant_name').slice(0, 60), tenant_phone: get('tenant_phone') };
    const due = Math.round(num(get('due_day')));
    if (due >= 1 && due <= 31) u.due_day = due;
    const sm = get('start_month');
    const m = /^(\d{4})[-/](\d{1,2})/.exec(sm);
    if (m && Number(m[2]) >= 1 && Number(m[2]) <= 12) u.start_month = `${m[1]}-${String(m[2]).padStart(2, '0')}`;
    units.push(u);
  });
  return { units, errors, columns: Object.keys(idx) };
}

export const SAMPLE_CSV = 'unit,rent,deposit,due_day,tenant_name,tenant_phone,start_month\n101,14000,28000,5,Asha Verma,9800000011,2026-04\n102,18500,37000,5,Rohan Mehta,9800000002,2026-07\n201,22000,44000,1,,,\n';
