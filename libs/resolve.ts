import type { StarlightRouteData } from '@astrojs/starlight/route-data';
import type { RuntimeConfig } from './config.ts';
import { getRelatedIndex, type IndexedPage, type RelatedIndex } from './index-builder.ts';
import { idForLocale, localeAgnosticKey } from './locale.ts';
import { groupSiblings } from './siblings.ts';

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
 * The current page's pathname and route ID are both known, so the site's `base`,
 * `trailingSlash` and `build.format` settings can be read straight off the
 * difference between them — no config plumbing, and correct by construction
 * even on sites that change those settings later.
 */
function hrefBuilder(pathname: string, routeId: string): (id: string) => string {
	const trailingSlash = pathname.endsWith('/') && pathname !== '/';
	const bare = trailingSlash ? pathname.slice(0, -1) : pathname;
	const asFile = bare.endsWith('.html');
	const withoutExtension = asFile ? bare.slice(0, -'.html'.length) : bare;

	// Whatever precedes the page's own ID is the site base.
	let base = withoutExtension;
	if (routeId && withoutExtension.endsWith(`/${routeId}`)) {
		base = withoutExtension.slice(0, -(routeId.length + 1));
	}

	return (target: string) => {
		const path = target ? `${base}/${target}` : base || '/';
		if (asFile) return `${path}.html`;
		if (!trailingSlash) return path || '/';
		return path.endsWith('/') ? path : `${path}/`;
	};
}

/**
 * Resolve one neighbour into the reader's locale.
 *
 * Suggestions always stay inside the locale the reader is browsing — the same
 * rule Starlight applies to its own sidebar and pagination. Where a translation
 * is missing, Starlight still serves the page at the localized URL using
 * default-locale content, so the href is localized unconditionally and only the
 * *title* falls back — which is exactly what the reader will find on arrival.
 */
function localizeSuggestion(
	neighborKey: string,
	localePrefix: string,
	index: RelatedIndex,
	href: (id: string) => string
): RelatedArticle | undefined {
	const key = localeAgnosticKey(neighborKey, index.localeKeys);
	const byLocale = index.translations.get(key);
	if (!byLocale) return undefined;

	const source = byLocale.get(localePrefix) ?? byLocale.values().next().value;
	if (!source) return undefined;

	const id = idForLocale(key, localePrefix);
	return { id, title: source.title, href: href(id) };
}

/**
 * Resolve the related articles for the page currently being rendered. Returns an
 * empty array when the page is excluded from the index (landing pages, drafts,
 * unlisted content) — callers should render nothing in that case.
 */
export async function resolveRelatedArticles(options: {
	config: RuntimeConfig;
	/**
	 * `Astro.locals.starlightRoute.entry.id` — the ID of the *content* backing
	 * this route. On a page using fallback content this is the default-locale
	 * entry, which is the one the similarity index knows about.
	 */
	entryId: string;
	/** `Astro.locals.starlightRoute.id` — the localized route ID. */
	routeId: string;
	/** `Astro.locals.starlightRoute.locale` — `undefined` for the root locale. */
	locale: string | undefined;
	/** `Astro.url.pathname`. */
	pathname: string;
	/** The current page's title, so a page never suggests a copy of itself. */
	title: string;
	/** `Astro.locals.starlightRoute.sidebar`, for the group-sibling fallback. */
	sidebar: StarlightRouteData['sidebar'];
}): Promise<RelatedArticle[]> {
	const { config, entryId, routeId, locale, pathname, title, sidebar } = options;
	const index = await getRelatedIndex(config);

	// Keyed off the entry, not the route: a page served with fallback content is
	// ranked as the entry that actually supplies its text.
	const page: IndexedPage | undefined = index.pagesById.get(entryId);
	if (!page) return [];

	const href = hrefBuilder(pathname, routeId);
	const localePrefix = locale ?? '';
	const neighbors = index.neighbors.get(index.shared ? page.key : page.id) ?? [];

	const seenTitles = new Set<string>([title]);
	const related: RelatedArticle[] = [];

	for (const neighborKey of neighbors) {
		const suggestion = localizeSuggestion(neighborKey, localePrefix, index, href);
		if (!suggestion || suggestion.id === routeId || suggestion.id === entryId) continue;
		// Re-run title de-duplication in the reader's language: two pages with
		// distinct source titles can share a translated one.
		if (config.dedupeByTitle) {
			if (seenTitles.has(suggestion.title)) continue;
			seenTitles.add(suggestion.title);
		}
		related.push(suggestion);
		if (related.length === config.count) break;
	}

	// A page that exists only outside `sourceLocale` has no counterpart in the
	// ranked corpus, so there is nothing to rank it against. Its sidebar group is
	// a weaker but still relevant signal, and beats an empty section.
	if (related.length === 0 && config.fallback === 'siblings') {
		return groupSiblings(sidebar, {
			currentHref: href(routeId),
			currentTitle: title,
			count: config.count,
			dedupeByTitle: config.dedupeByTitle,
		});
	}

	return related;
}
