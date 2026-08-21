import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
	idForLocale,
	localeAgnosticKey,
	localePrefixOf,
	matchesAnyGlob,
	sourceLocaleToPrefix,
} from '../libs/locale.ts';

const LOCALES = ['ja', 'de', 'zh-CN'];

describe('localePrefixOf', () => {
	it('returns the locale directory when the ID starts with one', () => {
		assert.equal(localePrefixOf('ja/guides/example', LOCALES), 'ja');
		assert.equal(localePrefixOf('zh-CN/guides/example', LOCALES), 'zh-CN');
	});

	it('returns an empty prefix for the root locale', () => {
		assert.equal(localePrefixOf('guides/example', LOCALES), '');
		assert.equal(localePrefixOf('', LOCALES), '');
	});

	it('does not mistake a content directory for a locale', () => {
		// `japanese/` is a content directory, not the `ja` locale.
		assert.equal(localePrefixOf('japanese/example', LOCALES), '');
		assert.equal(localePrefixOf('ja-notes/example', LOCALES), '');
	});

	it('treats every segment as content when no locales are configured', () => {
		assert.equal(localePrefixOf('ja/guides/example', []), '');
	});
});

describe('localeAgnosticKey', () => {
	it('strips the locale directory', () => {
		assert.equal(localeAgnosticKey('ja/guides/example', LOCALES), 'guides/example');
		assert.equal(localeAgnosticKey('zh-CN/guides/example', LOCALES), 'guides/example');
	});

	it('leaves root-locale IDs untouched', () => {
		assert.equal(localeAgnosticKey('guides/example', LOCALES), 'guides/example');
	});

	it('handles a locale root page', () => {
		assert.equal(localeAgnosticKey('ja', LOCALES), '');
	});

	it('round-trips through idForLocale', () => {
		for (const id of ['guides/example', 'ja/guides/example', 'zh-CN/a/b/c', 'ja']) {
			const prefix = localePrefixOf(id, LOCALES);
			assert.equal(idForLocale(localeAgnosticKey(id, LOCALES), prefix), id);
		}
	});
});

describe('idForLocale', () => {
	it('joins a key onto a locale prefix', () => {
		assert.equal(idForLocale('guides/example', 'ja'), 'ja/guides/example');
	});

	it('returns the bare key for the root locale', () => {
		assert.equal(idForLocale('guides/example', ''), 'guides/example');
	});
});

describe('sourceLocaleToPrefix', () => {
	it("maps Starlight's 'root' to the empty prefix", () => {
		assert.equal(sourceLocaleToPrefix('root'), '');
	});

	it('passes other locales through', () => {
		assert.equal(sourceLocaleToPrefix('ja'), 'ja');
	});

	it('stays undefined when unset, so per-locale ranking is used', () => {
		assert.equal(sourceLocaleToPrefix(undefined), undefined);
	});
});

describe('matchesAnyGlob', () => {
	it('matches an exact ID', () => {
		assert.ok(matchesAnyGlob('guides/example', ['guides/example']));
		assert.ok(!matchesAnyGlob('guides/example', ['guides/other']));
	});

	it('matches `*` within a single segment only', () => {
		assert.ok(matchesAnyGlob('guides/example', ['guides/*']));
		assert.ok(!matchesAnyGlob('guides/nested/example', ['guides/*']));
	});

	it('matches `**` across segments', () => {
		assert.ok(matchesAnyGlob('guides/nested/example', ['guides/**']));
		assert.ok(matchesAnyGlob('guides/example', ['guides/**']));
		assert.ok(matchesAnyGlob('a/b/c/d/e', ['**']));
	});

	it('anchors patterns at both ends', () => {
		// A bare substring must not match, or `exclude: ['api']` would silently
		// drop every page with "api" anywhere in its ID.
		assert.ok(!matchesAnyGlob('reference/api/auth', ['api']));
		assert.ok(matchesAnyGlob('reference/api/auth', ['reference/**']));
	});

	it('escapes regex metacharacters in patterns', () => {
		assert.ok(matchesAnyGlob('guides/a.b', ['guides/a.b']));
		// The `.` must be literal, not "any character".
		assert.ok(!matchesAnyGlob('guides/axb', ['guides/a.b']));
		assert.ok(matchesAnyGlob('guides/c++', ['guides/c++']));
	});

	it('returns false for an empty pattern list', () => {
		assert.ok(!matchesAnyGlob('guides/example', []));
	});

	it('matches if any pattern matches', () => {
		assert.ok(matchesAnyGlob('ja/guides/example', ['de/**', 'ja/**']));
	});
});
