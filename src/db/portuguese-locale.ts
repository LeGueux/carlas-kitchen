import type { Client, Row } from '@libsql/client';

const from = 'pt-PT';
const to = 'pt-BR';
export interface LocaleSnapshot {
  version: 1;
  from: typeof from;
  to: typeof to;
  tables: { name: string; rows: Row[] }[];
}

/** Explicit data migration, separate from startup/core migrations and demo seeds. */
export async function migratePortugueseLocale(client: Client, options: {
  apply?: boolean;
  backup?: (snapshot: LocaleSnapshot) => Promise<void>;
} = {}) {
  const tx = await client.transaction(options.apply ? 'write' : 'read');
  try {
    const tables = await tx.execute("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name");
    const snapshot: LocaleSnapshot = { version: 1, from, to, tables: [] };
    let targetRows = 0;
    for (const table of tables.rows) {
      const name = String(table.name);
      // Identifiers come only from SQLite's catalog and are validated before interpolation.
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) throw new Error('Unsupported database table name.');
      const columns = await tx.execute(`PRAGMA table_info("${name}")`);
      if (!columns.rows.some((column) => column.name === 'locale')) continue;
      const result = await tx.execute({ sql: `SELECT * FROM "${name}" WHERE locale = ?`, args: [from] });
      if (result.rows.length) snapshot.tables.push({ name, rows: result.rows });
      const target = await tx.execute({ sql: `SELECT COUNT(*) AS count FROM "${name}" WHERE locale = ?`, args: [to] });
      targetRows += Number(target.rows[0].count);
    }
    const sourceRows = snapshot.tables.reduce((sum, table) => sum + table.rows.length, 0);
    // Do not merge independently authored BR translations or category definitions.
    if (sourceRows && targetRows) throw new Error('Both pt-PT and pt-BR data exist. Review the translations before migration. No rows were changed.');
    if (options.apply && sourceRows) {
      if (!options.backup) throw new Error('A private backup is required before changing locale data.');
      await options.backup(snapshot);
      for (const table of snapshot.tables) {
        const result = await tx.execute({ sql: `UPDATE "${table.name}" SET locale = ? WHERE locale = ?`, args: [to, from] });
        if (result.rowsAffected !== table.rows.length) throw new Error('Unexpected migration row count.');
      }
    }
    await tx.commit();
    return {
      applied: !!options.apply,
      sourceRows,
      targetRows,
      tables: snapshot.tables.map((table) => ({ name: table.name, count: table.rows.length })),
    };
  } catch (error) {
    if (!tx.closed) await tx.rollback();
    throw error;
  } finally { tx.close(); }
}
