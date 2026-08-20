# starlight-related-articles

A [Starlight](https://starlight.astro.build/) plugin that adds a **Related articles** section to the bottom of every page, ranked by how similar the pages actually are — computed at build time from your own Markdown.

No tagging discipline. No embeddings API. No external service. No runtime JavaScript shipped to the browser.

```
Related articles
────────────────────────────────
Editing a site page
  ▸ Site & Blog › Site Pages

Adding a custom domain to your site
  ▸ Domains

Site settings reference
  ▸ Site & Blog
```

## Why not tags?

Tag-overlap is the usual way to do this, and on real documentation it under-performs badly.

In the corpus this plugin was extracted from — a ~600-article product help centre — pages carried a median of **2 tags** and **~24% had none at all**. Tag ranking therefore misses pairs that any reader would call related: a *Site Pages* article and a *Site Settings* article share no tag, but they are obviously neighbours. Worse, the untagged quarter of the site gets no suggestions whatsoever.

Ranking the **text** fixes both. This plugin builds TF-IDF vectors over your pages (sublinear term frequency, smoothed inverse document frequency, L2-normalized) and ranks neighbours by cosine similarity. Titles are weighted up, because a title term says far more about a page than a body term. IDF handles the rest for free: terms that appear on every page of *your* site — your product name, "settings", "click" — are suppressed automatically, with nobody maintaining a domain stopword list.

The whole thing is one O(n²) pass over the corpus at build time, memoized for the build. On ~1,200 pages it costs a couple of seconds and produces no client-side JS.

## Installation

```sh
npm install starlight-related-articles
```

```js
// astro.config.mjs
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import starlightRelatedArticles from 'starlight-related-articles';

export default defineConfig({
  integrations: [
    starlight({
      title: 'My Docs',
      plugins: [starlightRelatedArticles()],
    }),
  ],
});
```

That's it. Every article now ends with a related-articles section.

## What gets excluded

A page is kept out of the index — neither given suggestions nor offered as one — when it is:

- `draft: true`
- `sidebar: { hidden: true }` — category landing pages, unlisted or soft-beta content
- `template: splash` — your homepage
- matched by an `exclude` glob
- empty

This is usually the behaviour you want on day one: landing pages shouldn't recommend, and unlisted pages shouldn't be recommended.

## Configuration

Every option is optional.

```js
starlightRelatedArticles({
  count: 6,
  titleWeight: 3,
  sourceLocale: 'root',
  exclude: ['reference/api/**'],
  showTrail: true,
  trailSeparator: '›',
  trailIcon: 'list-format',
})
```

| Option | Type | Default | What it does |
| --- | --- | --- | --- |
| `count` | `number` | `6` | How many suggestions to render. |
| `neighbors` | `number` | `12` | How many to keep per page in the index. Headroom above `count` so title de-duplication still has candidates. |
| `titleWeight` | `number` | `3` | How many times a page's title is repeated into its term stream. |
| `minTermLength` | `number` | `3` | Terms shorter than this are ignored. |
| `stopWords` | `string[]` | ~50 structural English words | Words dropped before scoring. IDF already handles domain-ubiquitous terms. |
| `minScore` | `number` | `0` | Drop neighbours at or below this cosine similarity. |
| `dedupeByTitle` | `boolean` | `true` | Collapse same-titled pages to one suggestion (content cross-filed under several slugs). |
| `sourceLocale` | `string` | — | Rank one locale's corpus and share the result across translations. See below. |
| `exclude` | `string[]` | `[]` | Page-ID globs to keep out of the index. `*` matches within a segment, `**` across segments. |
| `showTrail` | `boolean` | `true` | Show each suggestion's sidebar group trail beneath its title. |
| `trailSeparator` | `string` | `'›'` | Separator between group-trail levels. |
| `trailIcon` | `StarlightIcon \| false` | `'list-format'` | Icon before the trail. Any [built-in Starlight icon](https://starlight.astro.build/reference/icons/), or `false`. |
| `injectComponent` | `boolean` | `true` | Render automatically. Set `false` to place the component yourself. |

### Multilingual sites: `sourceLocale`

Related articles are a property of the **article**, not of the language you happen to be reading it in. And whitespace tokenization — which is what TF-IDF does — is meaningless for Japanese, Chinese, or Thai, so ranking those corpora directly yields noise.

`sourceLocale` solves both at once: rank one locale's corpus, then resolve each neighbour to whichever translation the reader is on.

```js
starlightRelatedArticles({ sourceLocale: 'root' }) // or 'en', 'de', …
```

Suggestions are titled in the reader's language where a translation exists, and their URLs are always localized — matching Starlight's own fallback behaviour, where an untranslated page is served in the default language at the localized URL.

Leave `sourceLocale` unset to rank each locale's corpus independently.

### Styling

The markup is flat and every value is a CSS custom property. Styles live in a `starlight.related` cascade layer, so any unlayered rule in your own stylesheet wins without `!important`.

```html
<nav class="sl-related">
  <h2 class="sl-related__heading">Related articles</h2>
  <ul class="sl-related__list">
    <li class="sl-related__item">
      <a class="sl-related__link" href="…">Title</a>
      <span class="sl-related__trail">
        <svg class="sl-related__trail-icon" />Group › Subgroup
      </span>
    </li>
  </ul>
</nav>
```

```css
.sl-related {
  --sl-related-margin: 4rem;
  --sl-related-gap: 1rem;
  --sl-related-heading-size: 1.25rem;
  --sl-related-rule: 2px solid var(--sl-color-accent);
}
```

For a custom trail glyph, set `trailIcon: false` and draw your own:

```css
.sl-related__trail::before {
  content: '';
  width: 0.9em;
  height: 0.9em;
  background: currentColor;
  mask: url('/icons/folder.svg') center / contain no-repeat;
}
```

### Translating the heading

The heading uses Starlight's i18n system under the key `relatedArticles.title`. 27 languages ship with the plugin; override or add one from your own `i18n` collection:

```js
// src/content/i18n/de.json
{ "relatedArticles.title": "Weiterführende Artikel" }
```

## Placing the section yourself

By default the plugin overrides Starlight's `Pagination` component, because it is the one component Starlight renders unconditionally at the bottom of an article's content. **An existing `Pagination` override of yours is preserved and rendered first** — the plugin wraps it rather than replacing it, so you can keep your own prev/next design.

To take full control, turn the injection off and render the component wherever you like:

```js
starlightRelatedArticles({ injectComponent: false })
```

```astro
---
// src/components/Footer.astro
import Default from '@astrojs/starlight/components/Footer.astro';
import RelatedArticles from 'starlight-related-articles/components/RelatedArticles.astro';
---

<Default />
<RelatedArticles />
```

## Using the data directly

The ranking is attached to Starlight's route data by route middleware, so you can skip the component entirely and build your own UI — cards, a sidebar rail, a JSON endpoint:

```astro
---
import { getRelatedArticles } from 'starlight-related-articles/route-data';

const related = getRelatedArticles(Astro.locals);
// → [{ id: 'guides/example', title: 'Example', href: '/guides/example/' }, …]
---
```

`href` honours your `base`, `trailingSlash`, and `build.format` settings.

## How it fits together

| Piece | Role |
| --- | --- |
| `libs/similarity.ts` | TF-IDF vectors + cosine ranking. Pure functions, no Astro dependency. |
| `libs/index-builder.ts` | Reads the `docs` collection, filters it, ranks it once per build. |
| `libs/resolve.ts` | Picks the current page's neighbours and localizes them. |
| `middleware.ts` | Attaches the result to `Astro.locals.starlightRoute`. |
| `components/RelatedArticles.astro` | Presentation only. |

There is no build step to remember and no generated file to commit: the index is computed inside the Astro build, from the content collection, using whichever loader you already use.

## Compatibility

- Starlight `>=0.32.0`
- Astro `>=5.5.0`

## License

MIT
