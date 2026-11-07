import { DatabaseSync } from 'node:sqlite';
export function createDatabase(path = ':memory:') {
  const sqlite = new DatabaseSync(path);
  sqlite.exec('PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;');
  function prepare(sql, values = []) {
    return {
      bind: (...parameters) => prepare(sql, parameters),
      async first() { return sqlite.prepare(sql).get(...values) || null; },
      run() { const result = sqlite.prepare(sql).run(...values); return { meta: { changes: Number(result.changes) } }; },
      async all() { return { results: sqlite.prepare(sql).all(...values) }; },
    };
  }
  return {
    prepare,
    async batch(statements) {
      sqlite.exec('BEGIN IMMEDIATE');
      try {
        const result = [];
        for (const statement of statements) result.push(statement.run());
        sqlite.exec('COMMIT');
        return result;
      } catch (error) { sqlite.exec('ROLLBACK'); throw error; }
    },
    exec: sql => sqlite.exec(sql),
    close: () => sqlite.close(),
  };
}
