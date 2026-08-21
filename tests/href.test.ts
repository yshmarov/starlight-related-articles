import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { hrefBuilder } from '../libs/href.ts';

/**
 * `hrefBuilder` infers `base`, `trailingSlash` and `build.format` from the one
 * thing it can always see: the pathname Astro produced for the page it is
 * rendering, paired with that page's ID. These cases cover the matrix.
 */
describe('hrefBuilder', () => {
	it('handles the default: no base, trailing slash', () => {
		const href = hrefBuilder('/guides/example/', 'guides/example');
		assert.equal(href('reference/config'), '/reference/config/');
		assert.equal(href('other'), '/other/');
	});

	it('handles trailingSlash: never', () => {
		const href = hrefBuilder('/guides/example', 'guides/example');
		assert.equal(href('reference/config'), '/reference/config');
	});

	it("handles build.format: 'file'", () => {
		const href = hrefBuilder('/guides/example.html', 'guides/example');
		assert.equal(href('reference/config'), '/reference/config.html');
	});

	it('preserves a site base', () => {
		const href = hrefBuilder('/docs/guides/example/', 'guides/example');
		assert.equal(href('reference/config'), '/docs/reference/config/');
	});

	it('preserves a multi-segment base', () => {
		const href = hrefBuilder('/a/b/guides/example/', 'guides/example');
		assert.equal(href('reference/config'), '/a/b/reference/config/');
	});

	it('preserves a base with build.format: file', () => {
		const href = hrefBuilder('/docs/guides/example.html', 'guides/example');
		assert.equal(href('reference/config'), '/docs/reference/config.html');
	});

	it('handles localized IDs', () => {
		const href = hrefBuilder('/ja/guides/example/', 'ja/guides/example');
		assert.equal(href('ja/reference/config'), '/ja/reference/config/');
		// A root-locale target from a localized page still resolves correctly.
		assert.equal(href('reference/config'), '/reference/config/');
	});

	it('handles a localized ID under a base', () => {
		const href = hrefBuilder('/docs/ja/guides/example/', 'ja/guides/example');
		assert.equal(href('ja/reference/config'), '/docs/ja/reference/config/');
	});

	it('handles the site root page (empty ID)', () => {
		const href = hrefBuilder('/', '');
		assert.equal(href('guides/example'), '/guides/example/');
		assert.equal(href(''), '/');
	});

	it('handles a locale root page', () => {
		const href = hrefBuilder('/ja/', 'ja');
		assert.equal(href('ja/guides/example'), '/ja/guides/example/');
	});

	it('handles a base root page', () => {
		const href = hrefBuilder('/docs/', '');
		assert.equal(href('guides/example'), '/docs/guides/example/');
	});

	it('is not fooled by an ID that repeats a base segment', () => {
		// The page ID must be stripped from the END of the pathname, not from its
		// first occurrence, or the base would be computed as "/".
		const href = hrefBuilder('/guides/guides/example/', 'guides/example');
		assert.equal(href('reference/config'), '/guides/reference/config/');
	});
});
