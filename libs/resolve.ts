import type { RuntimeConfig } from './config.ts';
import { getRelatedIndex, keyFor, type IndexedPage, type RelatedIndex } from './index-builder.ts';
import { idForLocale } from './locale.ts';

export interface RelatedArticle {
	/** Full Starlight page ID of the suggestion. */
	id: string;
	/** Title in the reader's language where a translation exists. */
	title: string;
	/** Resolved URL, honouring `base`, `trailingSlash` and `build.format`. */
	href: string;
}

/**
 * Turn the current page's route into a URL builder for *any* page ID, without
 * reaching into Starlight's internals.
 *
 * The current page's pathname and ID are both known, so the site's `base`,
 * `trailingSlash` and `build.format` settings can be read straight off the
 * difference between them — no config plumbing, and correct by construction
 * even on sites that change those settings later.
 */
function hrefBuilder(pathname: string, id: string): (id: string) => string {
	const trailingSlash = pathname.endsWith('/') && pathname !== '/';
	const bare = trailingSlash ? pathname.slice(0, -1) : pathname;
	const asFile = bare.endsWith('.html');
	const withoutExtension = asFile ? bare.slice(0, -'.html'.length) : bare;

	// Whatever precedes the page's own ID is the site base.
	let base = withoutExtension;
	if (id && withoutExtension.endsWith(`/${id}`)) {
		base = withoutExtension.slice(0, -(id.length + 1));
	}

	return (target: string) => {
		const path = target ? `${base}/${target}` : base || '/';
		if (asFile) return `${path}.html`;
		if (!trailingSlash) return path || '/';
		return path.endsWith('/') ? path : `${path}/`;
	};
}

/**
 * Pick the best translation of a suggestion for the reader's locale.
 *
 * Starlight serves fallback content at the localized URL when a page has no
 * translation, so the *href* is always localized; only the title falls back to
 * the source locale, which mirrors what the reader will actually see on arrival.
 */
function localizeSuggestion(
	key: string,
	localePrefix: string,
	index: RelatedIndex,
	href: (id: string) => string
): RelatedArticle | undefined {
	if (!index.shared) {
		const page = index.pagesById.get(key);
		return page && { id: page.id, title: page.title, href: href(page.id) };
	}

	const byLocale = index.translations.get(key);
	if (!byLocale) return undefined;
	const translated = byLocale.get(localePrefix);
	// Fall back to any indexed translation for the title (there is always at
	// least one, or the key would not be in the index).
	const source = translated ?? byLocale.values().next().value;
	if (!source) return undefined;
	const id = idForLocale(key, localePrefix);
	return { id, title: source.title, href: href(id) };
}

/**
 * Resolve the related articles for the page currently being rendered. Returns an
 * empty array when the page is not in the index (landing pages, drafts, unlisted
 * content) — callers should render nothing in that case.
 */
export async function resolveRelatedArticles(options: {
	config: RuntimeConfig;
	/** `Astro.locals.starlightRoute.id` — the localized page ID. */
	id: string;
	/** `Astro.locals.starlightRoute.locale` — `undefined` for the root locale. */
	locale: string | undefined;
	/** `Astro.url.pathname`. */
	pathname: string;
	/** The current page's title, so a page never suggests a copy of itself. */
	title: string;
}): Promise<RelatedArticle[]> {
	const { config, id, locale, pathname, title } = options;
	const index = await getRelatedIndex(config);

	const page: IndexedPage | undefined = index.pagesById.get(id);
	if (!page) return [];

	const neighbors = index.neighbors.get(keyFor(page, index));
	if (!neighbors?.length) return [];

	const href = hrefBuilder(pathname, id);
	const localePrefix = locale ?? '';
	const seenTitles = new Set<string>([title]);
	const related: RelatedArticle[] = [];

	for (const key of neighbors) {
		const suggestion = localizeSuggestion(key, localePrefix, index, href);
		if (!suggestion || suggestion.id === id) continue;
		// Re-run title de-duplication in the reader's language: two pages with
		// distinct source titles can share a translated one.
		if (config.dedupeByTitle) {
			if (seenTitles.has(suggestion.title)) continue;
			seenTitles.add(suggestion.title);
		}
		related.push(suggestion);
		if (related.length === config.count) break;
	}

	return related;
}
