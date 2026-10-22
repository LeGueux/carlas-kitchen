import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hasPermission, type User } from '@emdash-cms/auth';

test('native Editor can manage recipes, publication, translations, media and categories without infrastructure or CMS settings', () => {
  const editor = { id: 'test-editor', role: 40 } as User;
  for (const permission of ['content:create', 'content:edit_any', 'content:publish_any', 'content:read_drafts', 'media:upload', 'media:read', 'taxonomies:manage'] as const) assert.equal(hasPermission(editor, permission), true, permission);
  assert.equal(hasPermission(editor, 'users:manage'), false);
  assert.equal(hasPermission(editor, 'settings:manage'), false);
});
