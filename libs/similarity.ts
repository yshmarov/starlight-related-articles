/**
 * Content-similarity ranking: classic TF-IDF cosine similarity over the text of
 * your docs.
 *
 * WHY content similarity instead of shared tags: tag sets on real documentation
 * are sparse and coarse (in the corpus this plugin was built for, ~2 tags per
 * article and ~24% of articles were untagged), so tag-overlap ranking misses
 * obviously-related pages whose tags simply don't intersect — a "Site Pages"
 * page and a "Site Settings" page share no tag but are plainly neighbours.
 * Ranking on the actual page text catches those, needs no tagging discipline,
 * and needs no external service: it's computed at build time from the Markdown
 * you already have.
 */

/**
 * Minimal structural stopwords only. IDF already suppresses terms that are
 * ubiquitous in *your* corpus (product names, "click", "settings"…) without
 * anyone hand-listing them, so this list deliberately stays generic.
 */
export const DEFAULT_STOP_WORDS = (
	'a an and are as at be but by for from had has have he her his i if in into is it its of on or ' +
	'our so that the their then there these they this to was we were what when which who will with you your'
).split(' ');

export interface SimilarityDocument {
	/** Stable key for this document — returned as-is in the neighbour lists. */
	key: string;
	/** Page title. Weighted more heavily than body text. */
	title: string;
	/** Raw Markdown body. */
	body: string;
}

export interface SimilarityOptions {
	/** How many neighbours to keep per document. */
	neighbors: number;
	/** How many times the title is repeated into the term stream. */
	titleWeight: number;
	/** Terms shorter than this are dropped. */
	minTermLength: number;
	/** Terms dropped before scoring. */
	stopWords: readonly string[];
	/** Drop neighbours whose cosine similarity is at or below this. */
	minScore: number;
	/**
	 * Collapse documents that share a title down to one neighbour. Docs sites
	 * that cross-file the same content under several slugs would otherwise
	 * recommend the same page three times.
	 */
	dedupeByTitle: boolean;
}

interface Vectorized {
	key: string;
	title: string;
	vec: Map<string, number>;
	norm: number;
}

/** Strip everything that isn't prose before tokenizing. */
function textOf(title: string, body: string, titleWeight: number): string {
	const clean = body
		.replace(/^---\r?\n[\s\S]*?\r?\n---/, ' ') // frontmatter, if the body still carries it
		.replace(/```[\s\S]*?```/g, ' ') // fenced code
		.replace(/~~~[\s\S]*?~~~/g, ' ') // fenced code, tilde form
		.replace(/`[^`\n]*`/g, ' ') // inline code
		.replace(/<[^>]+>/g, ' ') // HTML / JSX tags
		.replace(/https?:\/\/\S+/g, ' ') // URLs
		.replace(/[^a-zA-Z\s]/g, ' '); // punctuation and digits
	return `${`${title} `.repeat(titleWeight)}${clean}`.toLowerCase();
}

function termFrequencies(
	doc: SimilarityDocument,
	options: Pick<SimilarityOptions, 'titleWeight' | 'minTermLength' | 'stopWords'>
): Map<string, number> {
	const stop = new Set(options.stopWords);
	const tf = new Map<string, number>();
	for (const term of textOf(doc.title, doc.body, options.titleWeight).split(/\s+/)) {
		if (term.length < options.minTermLength || stop.has(term)) continue;
		tf.set(term, (tf.get(term) ?? 0) + 1);
	}
	return tf;
}

/** Sublinear TF, smoothed IDF, L2-normalized. */
function vectorize(docs: SimilarityDocument[], options: SimilarityOptions): Vectorized[] {
	const frequencies = docs.map((doc) => termFrequencies(doc, options));

	const documentFrequency = new Map<string, number>();
	for (const tf of frequencies) {
		for (const term of tf.keys()) {
			documentFrequency.set(term, (documentFrequency.get(term) ?? 0) + 1);
		}
	}

	const total = docs.length;
	return docs.map((doc, index) => {
		const vec = new Map<string, number>();
		let squared = 0;
		for (const [term, count] of frequencies[index]!) {
			const weight = (1 + Math.log(count)) * Math.log(total / documentFrequency.get(term)!);
			vec.set(term, weight);
			squared += weight * weight;
		}
		return { key: doc.key, title: doc.title, vec, norm: Math.sqrt(squared) || 1 };
	});
}

function cosine(a: Vectorized, b: Vectorized): number {
	// Iterate the smaller vector; the corpus is O(n²) pairs and this halves the
	// inner loop on lopsided pairs (short stub vs. long reference page).
	const [small, large] = a.vec.size < b.vec.size ? [a, b] : [b, a];
	let dot = 0;
	for (const [term, weight] of small.vec) {
		const other = large.vec.get(term);
		if (other !== undefined) dot += weight * other;
	}
	return dot / (a.norm * b.norm);
}

/**
 * Rank every document against every other one and return the best neighbours
 * per document, best-first, as a map of `key` → neighbour `key`s.
 */
export function buildSimilarityIndex(
	docs: SimilarityDocument[],
	options: SimilarityOptions
): Map<string, string[]> {
	const vectors = vectorize(docs, options);
	const index = new Map<string, string[]>();

	for (const target of vectors) {
		const scored: { doc: Vectorized; score: number }[] = [];
		for (const candidate of vectors) {
			if (candidate.key === target.key) continue;
			const score = cosine(target, candidate);
			if (score > options.minScore) scored.push({ doc: candidate, score });
		}
		// Ties broken by key so the output is deterministic across builds.
		scored.sort((a, b) => b.score - a.score || a.doc.key.localeCompare(b.doc.key));

		const seenTitles = new Set<string>([target.title]);
		const neighbors: string[] = [];
		for (const { doc } of scored) {
			if (options.dedupeByTitle) {
				if (seenTitles.has(doc.title)) continue;
				seenTitles.add(doc.title);
			}
			neighbors.push(doc.key);
			if (neighbors.length === options.neighbors) break;
		}
		index.set(target.key, neighbors);
	}

	return index;
}
