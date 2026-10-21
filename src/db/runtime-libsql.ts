import { createDialect as officialCreateDialect } from 'emdash/db/libsql';

export function createDialect(config: { url: string }) {
  const url = process.env.LIBSQL_DATABASE_URL ?? config.url;
  if ((import.meta.env?.PROD || process.env.NETLIFY) && (!url.startsWith('libsql://') || !process.env.LIBSQL_AUTH_TOKEN)) {
    throw new Error('A remote database and runtime authentication token are required.');
  }
  return officialCreateDialect({ url, authToken: process.env.LIBSQL_AUTH_TOKEN });
}
