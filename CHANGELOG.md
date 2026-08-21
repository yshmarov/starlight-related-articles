# Changelog

## 0.1.0

Initial release.

- Related-articles section ranked by TF-IDF cosine similarity over article text,
  computed at build time from the `docs` collection. No tags, no external
  service, no client-side JavaScript.
- `sourceLocale` ranks one locale's corpus and shares the result across
  translations, resolving each suggestion to the reader's locale. Correct for
  languages that do not tokenize on whitespace.
- Group trail under each suggestion, derived from the sidebar Starlight already
  built for the page.
- Sibling fallback (`fallback`) for pages the index cannot rank: the other pages
  in the sidebar group, or those filed in the same directory.
- Wraps an existing `Pagination` component override rather than replacing it.
- Results also exposed on Starlight's route data via
  `getRelatedArticles(Astro.locals)`, for building your own UI.
- UI string `relatedArticles.title` injected for 27 locales.
