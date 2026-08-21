import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildTrailMap, trailFor } from '../libs/trail.ts';
import { directorySiblings, groupSiblings } from '../libs/siblings.ts';
import type { StarlightRouteData } from '@astrojs/starlight/route-data';
import type { IndexedPage } from '../libs/index-builder.ts';

/**
 * Stand-ins for Starlight's sidebar entries, typed against the real union so
 * these tests break if the upstream shape changes.
 */
type SidebarEntry = StarlightRouteData['sidebar'][number];

const link = (label: string, href: string): SidebarEntry => ({
	type: 'link',
	label,
	href,
	isCurrent: false,
	badge: undefined,
	attrs: {},
});

const group = (label: string, entries: SidebarEntry[]): SidebarEntry => ({
	type: 'group',
	label,
	entries,
	collapsed: false,
	badge: undefined,
});

const SIDEBAR: SidebarEntry[] = [
	link('Overview', '/overview/'),
	group('Guides', [
		link('Getting started', '/guides/start/'),
		link('Installing', '/guides/install/'),
		group('Advanced', [link('Tuning', '/guides/advanced/tuning/'), link('Internals', '/guides/advanced/internals/')]),
	]),
	group('Reference', [link('Config', '/reference/config/')]),
];

describe('buildTrailMap', () => {
	it('maps each link to the labels of its enclosing groups', () => {
		const trails = buildTrailMap(SIDEBAR);
		assert.deepEqual(trails.get('/guides/start/'), ['Guides']);
		assert.deepEqual(trails.get('/guides/advanced/tuning/'), ['Guides', 'Advanced']);
		assert.deepEqual(trails.get('/reference/config/'), ['Reference']);
	});

	it('gives a top-level link an empty trail', () => {
		assert.deepEqual(buildTrailMap(SIDEBAR).get('/overview/'), []);
	});

	it('keeps the first trail for a link cross-filed in several groups', () => {
		const trails = buildTrailMap([
			group('Home group', [link('Shared', '/shared/')]),
			group('Other group', [link('Shared', '/shared/')]),
		]);
		assert.deepEqual(trails.get('/shared/'), ['Home group']);
	});

	it('handles an empty sidebar', () => {
		assert.equal(buildTrailMap([]).size, 0);
	});
});

describe('trailFor', () => {
	const trails = buildTrailMap(SIDEBAR);

	it('looks a trail up by exact href', () => {
		assert.deepEqual(trailFor(trails, '/guides/start/'), ['Guides']);
	});

	it('tolerates a trailing-slash mismatch in both directions', () => {
		assert.deepEqual(trailFor(trails, '/guides/start'), ['Guides']);
		assert.deepEqual(trailFor(buildTrailMap([group('G', [link('L', '/l')])]), '/l/'), ['G']);
	});

	it('returns an empty trail for an unknown href', () => {
		assert.deepEqual(trailFor(trails, '/nowhere/'), []);
	});
});

describe('groupSiblings', () => {
	const opts = { currentTitle: 'Getting started', count: 6, dedupeByTitle: true };

	it('returns the other links in the same group, in sidebar order', () => {
		const siblings = groupSiblings(SIDEBAR, { ...opts, currentHref: '/guides/start/' });
		assert.deepEqual(
			siblings.map((s) => s.title),
			['Installing']
		);
	});

	it('uses the innermost enclosing group, not an ancestor', () => {
		const siblings = groupSiblings(SIDEBAR, {
			...opts,
			currentHref: '/guides/advanced/tuning/',
			currentTitle: 'Tuning',
		});
		assert.deepEqual(
			siblings.map((s) => s.title),
			['Internals']
		);
	});

	it('excludes the current page even when the slash differs', () => {
		const siblings = groupSiblings(SIDEBAR, { ...opts, currentHref: '/guides/start' });
		assert.ok(!siblings.some((s) => s.href === '/guides/start/'));
	});

	it('honours the count cap', () => {
		const wide = [group('G', Array.from({ length: 10 }, (_, i) => link(`Page ${i}`, `/p${i}/`)))];
		const siblings = groupSiblings(wide, { currentHref: '/p0/', currentTitle: 'Page 0', count: 3, dedupeByTitle: true });
		assert.equal(siblings.length, 3);
	});

	it('de-duplicates by title when asked', () => {
		const dupes = [group('G', [link('Current', '/cur/'), link('Same', '/a/'), link('Same', '/b/')])];
		const args = { currentHref: '/cur/', currentTitle: 'Current', count: 6 };
		assert.equal(groupSiblings(dupes, { ...args, dedupeByTitle: true }).length, 1);
		assert.equal(groupSiblings(dupes, { ...args, dedupeByTitle: false }).length, 2);
	});

	it('never suggests a page sharing the current title', () => {
		const dupes = [group('G', [link('Current', '/cur/'), link('Current', '/elsewhere/')])];
		assert.deepEqual(
			groupSiblings(dupes, { currentHref: '/cur/', currentTitle: 'Current', count: 6, dedupeByTitle: true }),
			[]
		);
	});

	it('returns nothing when the page is not in the sidebar', () => {
		assert.deepEqual(groupSiblings(SIDEBAR, { ...opts, currentHref: '/not-listed/' }), []);
	});

	it('returns nothing for a top-level page with no group', () => {
		// `/overview/` sits at the sidebar root; its "siblings" are the groups
		// themselves, which are not links, so there is nothing to suggest.
		assert.deepEqual(groupSiblings(SIDEBAR, { ...opts, currentHref: '/overview/', currentTitle: 'Overview' }), []);
	});
});

describe('directorySiblings', () => {
	const page = (id: string, title: string, filePath: string): IndexedPage => ({
		id,
		title,
		prefix: '',
		key: id,
		dir: filePath.slice(0, filePath.lastIndexOf('/')),
		filePath,
	});
	const href = (id: string) => `/${id}/`;
	const GROUP = [
		page('a', 'Alpha', 'src/content/docs/funnels/a.md'),
		page('b', 'Bravo', 'src/content/docs/funnels/b.md'),
		page('c', 'Charlie', 'src/content/docs/funnels/c.md'),
	];

	it('returns the other pages in the directory', () => {
		const siblings = directorySiblings(GROUP, {
			currentId: 'a',
			currentTitle: 'Alpha',
			count: 6,
			dedupeByTitle: true,
			href,
		});
		assert.deepEqual(
			siblings.map((s) => s.title),
			['Bravo', 'Charlie']
		);
		assert.deepEqual(
			siblings.map((s) => s.href),
			['/b/', '/c/']
		);
	});

	it('honours the count cap', () => {
		const siblings = directorySiblings(GROUP, {
			currentId: 'a',
			currentTitle: 'Alpha',
			count: 1,
			dedupeByTitle: true,
			href,
		});
		assert.equal(siblings.length, 1);
	});

	it('de-duplicates by title and skips the current title', () => {
		const dupes = [...GROUP, page('d', 'Bravo', 'src/content/docs/funnels/d.md')];
		assert.equal(
			directorySiblings(dupes, { currentId: 'a', currentTitle: 'Alpha', count: 6, dedupeByTitle: true, href })
				.length,
			2
		);
		assert.equal(
			directorySiblings(dupes, { currentId: 'a', currentTitle: 'Bravo', count: 6, dedupeByTitle: true, href })
				.length,
			1
		);
	});

	it('returns nothing for an unknown directory', () => {
		assert.deepEqual(
			directorySiblings(undefined, {
				currentId: 'a',
				currentTitle: 'Alpha',
				count: 6,
				dedupeByTitle: true,
				href,
			}),
			[]
		);
	});
});
