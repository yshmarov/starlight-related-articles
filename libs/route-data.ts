import type { RelatedArticle } from './resolve.ts';

/**
 * Read the related articles this plugin's route middleware attached to Starlight's
 * route data.
 *
 * Starlight's `StarlightRouteData` type is re-exported rather than declared in a
 * module that can be augmented, so custom route-data properties arrive as
 * `unknown`. This accessor is the typed way in — for the bundled component and
 * for your own overrides alike:
 *
 * ```astro
 * ---
 * import { getRelatedArticles } from 'starlight-related-articles/route-data';
 * const related = getRelatedArticles(Astro.locals);
 * ---
 * ```
 */
export function getRelatedArticles(locals: App.Locals): RelatedArticle[] {
	const value = (locals.starlightRoute as Record<string, unknown>)['relatedArticles'];
	return Array.isArray(value) ? (value as RelatedArticle[]) : [];
}

export type { RelatedArticle };
