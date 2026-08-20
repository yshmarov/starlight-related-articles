import { z } from 'astro/zod';
import type { StarlightIcon } from '@astrojs/starlight/types';
import { DEFAULT_STOP_WORDS } from './similarity.ts';

export const configSchema = z.object({
		/**
		 * How many related articles to render.
		 *
		 * @default 6
		 */
		count: z.number().int().positive().default(6),
		/**
		 * How many neighbours to keep per page in the index. Kept a little above
		 * `count` so title de-duplication at render time still has candidates
		 * left to fall back on.
		 *
		 * @default 12
		 */
		neighbors: z.number().int().positive().default(12),
		/**
		 * How many times a page's title is repeated into its term stream. Title
		 * terms carry far more signal than body terms, so they're weighted up.
		 *
		 * @default 3
		 */
		titleWeight: z.number().int().positive().default(3),
		/**
		 * Terms shorter than this are ignored.
		 *
		 * @default 3
		 */
		minTermLength: z.number().int().positive().default(3),
		/**
		 * Words dropped before scoring. Defaults to a short list of structural
		 * English stopwords — IDF already suppresses terms that are ubiquitous in
		 * your own corpus, so this rarely needs extending.
		 */
		stopWords: z.array(z.string()).default([...DEFAULT_STOP_WORDS]),
		/**
		 * Drop neighbours scoring at or below this cosine similarity. `0` keeps
		 * every page that shares at least one meaningful term.
		 *
		 * @default 0
		 */
		minScore: z.number().min(0).max(1).default(0),
		/**
		 * Collapse pages that share a title down to a single suggestion. Useful
		 * when the same content is cross-filed under several slugs.
		 *
		 * @default true
		 */
		dedupeByTitle: z.boolean().default(true),
		/**
		 * Compute similarity once over a single locale and reuse the result for
		 * every translation, instead of ranking each locale's corpus separately.
		 *
		 * Related articles are a property of the *article*, not of the language
		 * it's being read in — and non-whitespace-delimited languages (Japanese,
		 * Chinese, Thai…) don't tokenize on whitespace at all, so ranking their
		 * corpora directly produces noise. Pointing this at your default locale
		 * fixes both problems at once: neighbours are resolved to whichever
		 * translation the reader is on, by title and URL.
		 *
		 * Pass a locale key from your Starlight `locales` config, or `'root'` for
		 * the root locale. Leave unset to rank every locale independently.
		 *
		 * @default undefined
		 */
		sourceLocale: z.string().optional(),
		/**
		 * Page IDs to keep out of the index entirely — they are neither given
		 * related articles nor suggested as one. Supports `*` and `**` globs and
		 * is matched against the page ID (the path after `src/content/docs/`,
		 * without a file extension, e.g. `guides/example` or `ja/guides/example`).
		 *
		 * Pages that are `draft`, `sidebar.hidden`, or use the `splash` template
		 * are excluded automatically.
		 *
		 * @default []
		 */
		exclude: z.array(z.string()).default([]),
		/**
		 * Show each suggestion's sidebar group trail (e.g. `Guides > Advanced`)
		 * beneath its title. Resolved from the sidebar Starlight already built
		 * for the page, so it costs nothing and needs no configuration.
		 *
		 * @default true
		 */
		showTrail: z.boolean().default(true),
		/**
		 * Separator between the levels of a suggestion's group trail.
		 *
		 * @default '›'
		 */
		trailSeparator: z.string().default('\u203a'),
		/**
		 * Icon shown before the group trail. Accepts any built-in Starlight icon
		 * name, or `false` for no icon (style `.sl-related__trail::before`
		 * yourself if you want a custom glyph).
		 *
		 * @default 'list-format'
		 */
		trailIcon: z.union([z.custom<StarlightIcon>((v) => typeof v === 'string'), z.literal(false)])
			.default('list-format' satisfies StarlightIcon),
		/**
		 * Render the section automatically at the bottom of every article by
		 * overriding Starlight's `Pagination` component. Any existing
		 * `Pagination` override of yours is preserved and rendered first.
		 *
		 * Set to `false` to place `<RelatedArticles />` yourself.
		 *
		 * @default true
		 */
		injectComponent: z.boolean().default(true),
});

export type StarlightRelatedArticlesUserConfig = Partial<z.input<typeof configSchema>>;
export type StarlightRelatedArticlesConfig = z.output<typeof configSchema>;

/** Config the runtime (middleware + component) needs, serialized into a virtual module. */
export type RuntimeConfig = Pick<
	StarlightRelatedArticlesConfig,
	| 'count'
	| 'neighbors'
	| 'titleWeight'
	| 'minTermLength'
	| 'stopWords'
	| 'minScore'
	| 'dedupeByTitle'
	| 'sourceLocale'
	| 'exclude'
	| 'showTrail'
	| 'trailSeparator'
	| 'trailIcon'
> & {
	/** Locale keys from the Starlight config, excluding the root locale. */
	localeKeys: string[];
	/** The resolved `sourceLocale`, normalized to `''` for the root locale. */
	sourceLocalePrefix: string | undefined;
};
