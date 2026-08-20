import type { StarlightRouteData } from '@astrojs/starlight/route-data';

/** Starlight exports the route-data type but not its sidebar entry type. */
type SidebarEntry = StarlightRouteData['sidebar'][number];

/**
 * Map every link in the page's sidebar to the labels of the groups containing
 * it, so a suggestion can be shown with its place in the docs ("Guides >
 * Advanced"). Uses the sidebar Starlight already built for this route — no
 * separate navigation source to keep in sync.
 *
 * A link appearing in more than one group (content cross-filed under several
 * sections) keeps its first trail, which is the one the sidebar treats as its
 * home.
 */
export function buildTrailMap(sidebar: SidebarEntry[]): Map<string, string[]> {
	const trails = new Map<string, string[]>();

	const walk = (entries: SidebarEntry[], ancestors: string[]) => {
		for (const entry of entries) {
			if (entry.type === 'group') {
				walk(entry.entries, [...ancestors, entry.label]);
			} else if (!trails.has(entry.href)) {
				trails.set(entry.href, ancestors);
			}
		}
	};
	walk(sidebar, []);

	return trails;
}

/** Look a trail up by href, tolerating a trailing-slash mismatch. */
export function trailFor(trails: Map<string, string[]>, href: string): string[] {
	const exact = trails.get(href);
	if (exact) return exact;
	const alternate = href.endsWith('/') ? href.slice(0, -1) : `${href}/`;
	return trails.get(alternate) ?? [];
}
