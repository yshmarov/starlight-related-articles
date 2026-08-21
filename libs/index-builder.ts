import { getCollection } from 'astro:content';
import type { RuntimeConfig } from './config.ts';
import {
	buildSimilarityIndex,
	type SimilarityDocument,
	type SimilarityOptions,
} from './similarity.ts';
import { localeAgnosticKey, localePrefixOf, matchesAnyGlob } from './locale.ts';

export interface IndexedPage {
	/** Full Starlight page ID, e.g. `ja/guides/example`. */
	id: string;
	title: string;
	/** Locale prefix — `''` for the root locale. */
	prefix: string;
	/** ID with the locale prefix stripped. */
	key: string;
}

export interface RelatedIndex {
	/** Neighbour lists, best-first. Keyed by locale-agnostic key when a
	 *  `sourceLocale` is shared across translations, otherwise by full page ID. */
	neighbors: Map<string, string[]>;
	/** Every indexed page, addressable by full page ID. */
	pagesById: Map<string, IndexedPage>;
	/** Indexed pages grouped by locale-agnostic key, then locale prefix. */
	translations: Map<string, Map<string, IndexedPage>>;
	/** Whether one locale's ranking is shared across all translations. */
	shared: boolean;
	/** Locale directory names, so callers can split IDs without the config. */
	localeKeys: string[];
}

/**
 * Whether a page belongs in the index at all. Pages excluded here are neither
 * given related articles nor offered as one — which is what you want for
 * category landing pages, drafts, and unlisted/soft-launch content.
 */
function isIndexable(data: Record<string, any>, id: string, config: RuntimeConfig): boolean {
	if (data.draft) return false;
	if (data.sidebar?.hidden) return false;
	if (data.template === 'splash') return false;
	if (config.exclude.length > 0 && matchesAnyGlob(id, config.exclude)) return false;
	return true;
}

async function build(config: RuntimeConfig): Promise<RelatedIndex> {
	const entries = await getCollection('docs');

	const pagesById = new Map<string, IndexedPage>();
	const translations = new Map<string, Map<string, IndexedPage>>();
	const shared = config.sourceLocalePrefix !== undefined;
	const documents: SimilarityDocument[] = [];

	for (const entry of entries) {
		const id = entry.id;
		const data = entry.data as Record<string, any>;
		if (!isIndexable(data, id, config)) continue;

		const prefix = localePrefixOf(id, config.localeKeys);
		const page: IndexedPage = {
			id,
			title: data.title,
			prefix,
			key: localeAgnosticKey(id, config.localeKeys),
		};
		pagesById.set(id, page);
		let byLocale = translations.get(page.key);
		if (!byLocale) translations.set(page.key, (byLocale = new Map()));
		byLocale.set(prefix, page);

		// With a `sourceLocale`, only that locale's corpus is ranked; its result is
		// then resolved into whichever translation the reader is on.
		if (shared && prefix !== config.sourceLocalePrefix) continue;

		const body = entry.body ?? '';
		if (!body.trim()) continue;
		documents.push({ key: shared ? page.key : id, title: page.title, body });
	}

	const options: SimilarityOptions = {
		neighbors: config.neighbors,
		titleWeight: config.titleWeight,
		minTermLength: config.minTermLength,
		stopWords: config.stopWords,
		minScore: config.minScore,
		dedupeByTitle: config.dedupeByTitle,
	};

	return {
		neighbors: buildSimilarityIndex(documents, options),
		pagesById,
		translations,
		shared,
		localeKeys: config.localeKeys,
	};
}

/**
 * The whole corpus is ranked once per build and reused by every page. Astro
 * renders all routes in one process, so memoizing the promise here keeps this
 * O(n²) pass off the per-page path — the first page rendered pays for it, the
 * rest read the result.
 */
let pending: Promise<RelatedIndex> | undefined;

export function getRelatedIndex(config: RuntimeConfig): Promise<RelatedIndex> {
	return (pending ??= build(config));
}

/** Test/dev-server escape hatch: forget the memoized index. */
export function resetRelatedIndex(): void {
	pending = undefined;
}
