import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import starlightRelatedArticles from 'starlight-related-articles';

// Smallest configuration that exercises the plugin: add it to `plugins` and
// every article gets a related-articles section. Everything else here is
// ordinary Starlight.
export default defineConfig({
  site: 'https://example.com',
  integrations: [
    starlight({
      title: 'Nimbus',
      description: 'Demo site for starlight-related-articles.',
      pagination: false,
      // Nested groups, so the trail under each suggestion has something to show.
      sidebar: [
        {
          label: 'Guides',
          items: [
            { label: 'Domains', items: [{ autogenerate: { directory: 'guides/domains' } }] },
            { label: 'Email', items: [{ autogenerate: { directory: 'guides/email' } }] },
            { label: 'Team', items: [{ autogenerate: { directory: 'guides/team' } }] },
          ],
        },
        { label: 'Reference', items: [{ autogenerate: { directory: 'reference' } }] },
      ],
      plugins: [
        // `count: 3` because this demo corpus is tiny. On a real corpus the
        // default of 6 is right; below ~30 pages there simply are not six
        // genuinely related articles to show, and the tail fills with noise.
        starlightRelatedArticles({ count: 3 }),
      ],
    }),
  ],
});
