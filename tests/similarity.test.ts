import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
	buildSimilarityIndex,
	DEFAULT_STOP_WORDS,
	type SimilarityDocument,
	type SimilarityOptions,
} from '../libs/similarity.ts';

const OPTIONS: SimilarityOptions = {
	neighbors: 12,
	titleWeight: 3,
	minTermLength: 3,
	stopWords: DEFAULT_STOP_WORDS,
	minScore: 0,
	dedupeByTitle: true,
};

const options = (overrides: Partial<SimilarityOptions> = {}): SimilarityOptions => ({
	...OPTIONS,
	...overrides,
});

const doc = (key: string, title: string, body: string): SimilarityDocument => ({ key, title, body });

/**
 * Filler pages with vocabulary shared by nothing else.
 *
 * IDF weights a term by `log(N / documentFrequency)`, so a term present in
 * *every* document scores exactly zero. That is the property that lets the
 * plugin ship without a domain stopword list — but it means a corpus of two or
 * three near-identical pages has no distinctive vocabulary at all and correctly
 * yields no suggestions. Real corpora are large; these fillers give the toy
 * corpora below the same shape.
 */
const filler = (count: number): SimilarityDocument[] =>
	Array.from({ length: count }, (_, i) =>
		doc(`filler-${i}`, `Filler ${i}`, `unrelated${i} vocabulary${i} nothing${i} shared${i}`)
	);

describe('buildSimilarityIndex', () => {
	it('ranks the page sharing distinctive vocabulary first', () => {
		const index = buildSimilarityIndex(
			[
				doc('domains-connect', 'Connecting a domain', 'Point your domain nameservers at us and verify DNS.'),
				doc('domains-remove', 'Removing a domain', 'Detach a domain and clear its DNS records.'),
				doc('email-design', 'Designing an email', 'Drag blocks onto the canvas to lay out an email.'),
				...filler(4),
			],
			options()
		);
		assert.equal(index.get('domains-connect')?.[0], 'domains-remove');
		// Nothing in the corpus is about email, so it gets no suggestions at all
		// rather than an irrelevant one.
		assert.deepEqual(index.get('email-design'), []);
	});

	it('weights title terms above body terms', () => {
		// Both candidates hold the same four terms and the same document length —
		// they differ only in whether "webhooks" sits in the title or the body. That
		// isolates the title weighting from L2 length normalization, which otherwise
		// favours whichever page is shorter regardless of where the term appears.
		const corpus = [
			doc('target', 'Webhooks', 'alpha bravo'),
			doc('title-match', 'Webhooks zulu', 'papa quebec'),
			doc('body-match', 'Papa quebec', 'webhooks zulu'),
			...filler(4),
		];
		assert.deepEqual(buildSimilarityIndex(corpus, options({ titleWeight: 1 })).get('target'), [
			'body-match',
			'title-match',
		]);
		// Counting the title more than once is enough to flip the order.
		assert.deepEqual(buildSimilarityIndex(corpus, options({ titleWeight: 3 })).get('target'), [
			'title-match',
			'body-match',
		]);
	});

	it('suppresses corpus-wide terms without a domain stopword list', () => {
		// "acme" is on every page, so IDF drives its weight to zero and the ranking
		// is decided entirely by the distinctive terms.
		const index = buildSimilarityIndex(
			[
				doc('billing', 'Acme billing', 'acme invoices receipts'),
				doc('invoices', 'Acme invoices', 'acme invoices receipts'),
				doc('shipping', 'Acme shipping', 'acme parcels couriers'),
				doc('couriers', 'Acme couriers', 'acme couriers parcels'),
			],
			options()
		);
		assert.equal(index.get('billing')?.[0], 'invoices');
		assert.equal(index.get('shipping')?.[0], 'couriers');
	});

	it('gives a term on every page zero weight', () => {
		// Two pages whose only vocabulary is shared by both have nothing
		// distinctive to compare, so the corpus yields no suggestions.
		const index = buildSimilarityIndex(
			[doc('a', 'Alpha', 'identical text'), doc('b', 'Beta', 'identical text')],
			options()
		);
		assert.deepEqual(index.get('a'), []);
		assert.deepEqual(index.get('b'), []);
	});

	it('collapses same-titled pages when dedupeByTitle is on', () => {
		const corpus = [
			doc('target', 'Target', 'shipping labels parcels'),
			doc('dupe-a', 'Shipping', 'shipping labels parcels'),
			doc('dupe-b', 'Shipping', 'shipping labels parcels'),
			doc('other', 'Invoices', 'invoices receipts parcels'),
			...filler(4),
		];
		assert.deepEqual(buildSimilarityIndex(corpus, options()).get('target'), ['dupe-a', 'other']);
		assert.deepEqual(buildSimilarityIndex(corpus, options({ dedupeByTitle: false })).get('target'), [
			'dupe-a',
			'dupe-b',
			'other',
		]);
	});

	it('never suggests the page itself, even against an identical twin', () => {
		const index = buildSimilarityIndex(
			[
				doc('a', 'Original', 'nameservers dns records'),
				doc('b', 'Twin', 'nameservers dns records'),
				...filler(4),
			],
			options()
		);
		assert.deepEqual(index.get('a'), ['b']);
		assert.deepEqual(index.get('b'), ['a']);
	});

	it('breaks score ties deterministically by key', () => {
		// Candidates with byte-identical text score exactly equal, so only the
		// tie-break decides the order. Shuffling the input must not change it.
		const build = (keys: string[]) =>
			buildSimilarityIndex(
				[
					doc('target', 'Target', 'alpha beta gamma'),
					...keys.map((k) => doc(k, k, 'alpha beta gamma')),
					...filler(4),
				],
				options()
			).get('target');

		assert.deepEqual(build(['ccc', 'aaa', 'bbb']), ['aaa', 'bbb', 'ccc']);
		assert.deepEqual(build(['bbb', 'ccc', 'aaa']), ['aaa', 'bbb', 'ccc']);
	});

	it('caps each list at `neighbors`', () => {
		const corpus = [
			...Array.from({ length: 20 }, (_, i) => doc(`p${i}`, `Page ${i}`, 'shared body text')),
			...filler(4),
		];
		assert.equal(buildSimilarityIndex(corpus, options({ neighbors: 4 })).get('p0')?.length, 4);
		assert.equal(buildSimilarityIndex(corpus, options({ neighbors: 50 })).get('p0')?.length, 19);
	});

	it('drops neighbours at or below minScore', () => {
		const corpus = [
			doc('a', 'Alpha', 'domains dns nameservers'),
			doc('b', 'Beta', 'domains dns nameservers'),
			doc('c', 'Gamma', 'completely different words entirely'),
			...filler(4),
		];
		assert.equal(buildSimilarityIndex(corpus, options()).get('a')?.length, 1);
		assert.equal(buildSimilarityIndex(corpus, options({ minScore: 0.99 })).get('a')?.length, 0);
	});

	it('ignores fenced code blocks but keeps inline code', () => {
		const index = buildSimilarityIndex(
			[
				doc('target', 'Target', 'The `nameserver` value is required.'),
				doc('inline', 'Inline', 'Set the `nameserver` field before saving.'),
				doc('fenced', 'Fenced', '```\nnameserver nameserver nameserver\n```'),
				...filler(4),
			],
			options()
		);
		// Inline code is part of a sentence and counts; a fenced listing does not.
		assert.deepEqual(index.get('target'), ['inline']);
	});

	it('ignores tilde-fenced code blocks too', () => {
		const index = buildSimilarityIndex(
			[
				doc('target', 'Target', 'nameserver guidance'),
				doc('fenced', 'Fenced', '~~~\nnameserver nameserver\n~~~'),
				...filler(4),
			],
			options()
		);
		assert.deepEqual(index.get('target'), []);
	});

	it('ignores HTML tags, URLs and digits', () => {
		const index = buildSimilarityIndex(
			[
				doc('target', 'Target', 'nameserver'),
				doc('noise', 'Noise', '<div class="nameserver">1234</div> https://example.com/nameserver'),
				doc('prose', 'Prose', 'nameserver settings'),
				...filler(4),
			],
			options()
		);
		// `noise` mentions "nameserver" only inside an attribute and a URL, so it
		// must not register as a match.
		assert.deepEqual(index.get('target'), ['prose']);
	});

	it('drops stopwords and short terms', () => {
		const index = buildSimilarityIndex(
			[
				doc('target', 'Target', 'the and of it is a to'),
				doc('stopwords-only', 'Stopwords', 'the and of it is a to'),
				...filler(4),
			],
			options()
		);
		// Nothing survives tokenization, so there is no similarity to report.
		assert.deepEqual(index.get('target'), []);
	});

	it('respects a custom stopword list', () => {
		const corpus = [
			doc('target', 'Target', 'widget sprocket'),
			doc('widget', 'Widget page', 'widget widget widget'),
			doc('sprocket', 'Sprocket page', 'sprocket sprocket sprocket'),
			...filler(4),
		];
		assert.equal(buildSimilarityIndex(corpus, options()).get('target')?.length, 2);
		assert.deepEqual(
			buildSimilarityIndex(corpus, options({ stopWords: ['widget', 'sprocket'] })).get('target'),
			[]
		);
	});

	it('respects minTermLength', () => {
		const corpus = [
			doc('target', 'Target', 'dns'),
			doc('match', 'Match', 'dns dns'),
			...filler(4),
		];
		assert.deepEqual(buildSimilarityIndex(corpus, options({ minTermLength: 3 })).get('target'), ['match']);
		assert.deepEqual(buildSimilarityIndex(corpus, options({ minTermLength: 4 })).get('target'), []);
	});

	it('handles an empty corpus and a single document', () => {
		assert.equal(buildSimilarityIndex([], options()).size, 0);
		assert.deepEqual(buildSimilarityIndex([doc('only', 'Only', 'text')], options()).get('only'), []);
	});

	it('is stable across repeated runs', () => {
		const corpus = [
			doc('a', 'Domains', 'domain dns nameserver records'),
			doc('b', 'Subdomains', 'subdomain dns nameserver records'),
			doc('c', 'Email', 'email smtp delivery'),
			...filler(6),
		];
		const first = buildSimilarityIndex(corpus, options());
		const second = buildSimilarityIndex([...corpus].reverse(), options());
		for (const key of first.keys()) {
			assert.deepEqual(second.get(key), first.get(key), `neighbours of ${key} changed with input order`);
		}
	});
});
