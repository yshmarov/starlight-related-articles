import type { StarlightRouteData } from '@astrojs/starlight/route-data';
import type { RelatedArticle } from './resolve.ts';

type SidebarEntry = StarlightRouteData['sidebar'][number];

/**
 * The other pages in the current page's sidebar group, in sidebar order.
 *
 * Used as a fallback for pages the similarity index can't rank — most often a
 * page that exists only outside the `sourceLocale`, so it has no counterpart in
 * the ranked corpus. Group siblings are a weaker signal than content
 * similarity, but they are still relevant and reliably better than rendering
 * nothing at all.
 */
export function groupSiblings(
	sidebar: SidebarEntry[],
	options: { currentHref: string; currentTitle: string; count: number; dedupeByTitle: boolean }
): RelatedArticle[] {
	const { currentHref, currentTitle, count, dedupeByTitle } = options;
	const group = findGroupOf(sidebar, currentHref);
	if (!group) return [];

	const seenTitles = new Set<string>([currentTitle]);
	const siblings: RelatedArticle[] = [];
	for (const entry of group) {
		if (entry.type !== 'link' || sameHref(entry.href, currentHref)) continue;
		if (dedupeByTitle) {
			if (seenTitles.has(entry.label)) continue;
			seenTitles.add(entry.label);
		}
		siblings.push({ id: entry.href, title: entry.label, href: entry.href });
		if (siblings.length === count) break;
	}
	return siblings;
}

/**
 * The innermost list of sidebar entries containing the current page. Falls back
 * to the sidebar root for a page that sits outside every group.
 */
function findGroupOf(sidebar: SidebarEntry[], href: string): SidebarEntry[] | undefined {
	let rootMatch: SidebarEntry[] | undefined;

	const walk = (entries: SidebarEntry[]): SidebarEntry[] | undefined => {
		for (const entry of entries) {
			if (entry.type === 'group') {
				const found = walk(entry.entries);
				if (found) return found;
			} else if (sameHref(entry.href, href)) {
				return entries;
			}
		}
		return undefined;
	};

	rootMatch = walk(sidebar);
	return rootMatch;
}

/** Compare hrefs tolerating a trailing-slash mismatch. */
function sameHref(a: string, b: string): boolean {
	const trim = (v: string) => (v.endsWith('/') && v !== '/' ? v.slice(0, -1) : v);
	return trim(a) === trim(b);
}
