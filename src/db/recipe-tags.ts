import { randomUUID } from 'node:crypto';
import type { Client, Row } from '@libsql/client';

const labels = { en: ['Tags', 'Tag'], fr: ['Étiquettes', 'Étiquette'], 'pt-BR': ['Etiquetas', 'Etiqueta'] };

/** Add recipes to the existing taxonomy without replacing terms or assignments. */
export async function configureRecipeTags(client: Client, options: { apply?: boolean; backup?: (rows: Row[]) => Promise<void> } = {}) {
  const tx = await client.transaction('write');
  try {
    const rows = (await tx.execute("SELECT * FROM _emdash_taxonomy_defs WHERE name = 'tag'")).rows;
    const groups = new Set(rows.map((row) => row.translation_group));
    if (groups.size > 1) throw new Error('Tag definitions have inconsistent translation groups. Review manually.');
    const collections = [...new Set([...rows.flatMap((row) => JSON.parse(String(row.collections)) as string[]), 'recipes'])];
    const serialized = JSON.stringify(collections);
    const missing = Object.keys(labels).filter((locale) => !rows.some((row) => row.locale === locale));
    const changed = rows.filter((row) => String(row.collections) !== serialized).length + missing.length;
    if (options.apply && changed) {
      if (!options.backup) throw new Error('A backup callback is required.');
      await options.backup(rows);
      const group = String(rows[0]?.translation_group ?? randomUUID());
      await tx.execute({ sql: "UPDATE _emdash_taxonomy_defs SET collections = ? WHERE name = 'tag'", args: [serialized] });
      for (const locale of missing) {
        const [label, singular] = labels[locale as keyof typeof labels];
        await tx.execute({ sql: 'INSERT INTO _emdash_taxonomy_defs (id, name, label, label_singular, hierarchical, collections, locale, translation_group) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', args: [rows.length === 0 && locale === 'en' ? group : randomUUID(), 'tag', label, singular, Number(rows[0]?.hierarchical ?? 0), serialized, locale, group] });
      }
      await tx.commit();
    } else await tx.rollback();
    return { changed, applied: !!options.apply, collections, addedLocales: missing };
  } catch (error) { await tx.rollback(); throw error; }
  finally { tx.close(); }
}
