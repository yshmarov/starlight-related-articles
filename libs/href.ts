/**
 * Turn the current page's route into a URL builder for *any* page ID, without
 * reaching into Starlight's internals.
 *
 * The current page's pathname and route ID are both known, so the site's `base`,
 * `trailingSlash` and `build.format` settings can be read straight off the
 * difference between them — no config plumbing, and correct by construction
 * even on sites that change those settings later.
 */
export function hrefBuilder(pathname: string, routeId: string): (id: string) => string {
	// `/` alone carries no evidence either way, so it is read as trailing-slash
	// style — Astro's default, and the two are indistinguishable at the root.
	const trailingSlash = pathname.endsWith('/');
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

