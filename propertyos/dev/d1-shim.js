// Minimal D1-compatible wrapper over node:sqlite, for local dev and tests only.
import { DatabaseSync } from 'node:sqlite';

export function createD1(path = ':memory:') {
  const sqlite = new DatabaseSync(path);
  sqlite.exec('PRAGMA journal_mode = WAL;');

  const mk = (sql, args = []) => ({
    bind: (...a) => mk(sql, a),
    first: async () => sqlite.prepare(sql).get(...args) ?? null,
    all: async () => ({ results: sqlite.prepare(sql).all(...args), success: true }),
    run: async () => {
      const r = sqlite.prepare(sql).run(...args);
      return { success: true, meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) } };
    },
    _sql: sql,
    _args: args,
  });

  return {
    prepare: (sql) => mk(sql),
    batch: async (stmts) => {
      sqlite.exec('BEGIN');
      try {
        const out = [];
        for (const s of stmts) out.push(await s.run());
        sqlite.exec('COMMIT');
        return out;
      } catch (e) {
        sqlite.exec('ROLLBACK');
        throw e;
      }
    },
    _raw: sqlite,
  };
}
