import { definePlugin, definePluginRoute, pluginResponse } from 'emdash';
import { handleRecipeTranslation } from '../../server/recipe-translation-route';

export function createPlugin(options: { adminEntry: string }) {
  return definePlugin({
    id: 'kitchen-translations', version: '1.0.0',
    capabilities: ['content:read', 'content:revisions:read'],
    admin: { entry: options.adminEntry },
    routes: {
      status: { permission: 'content:edit_any', methods: ['GET'], handler: async () => ({ configured: !!process.env.DEEPL_API_KEY }) },
      translate: definePluginRoute({
        permission: 'content:edit_any', methods: ['POST'],
        request: { body: 'json', maxBytes: 2000 }, response: 'raw',
        handler: async (ctx) => {
          const result = await handleRecipeTranslation(ctx);
          return pluginResponse({ status: result.status, headers: { 'Content-Type': 'application/json' }, body: { kind: 'text', value: await result.text() } });
        },
      }),
    },
  });
}
