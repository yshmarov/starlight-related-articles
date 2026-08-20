declare module 'virtual:starlight-related-articles/config' {
	const config: import('./libs/config.ts').RuntimeConfig;
	export default config;
}

declare module 'virtual:starlight-related-articles/user-pagination' {
	/**
	 * Whatever `Pagination` override was configured before this plugin ran, or
	 * Starlight's own `Pagination` when there was none. Rendered above the
	 * related-articles section so an existing override keeps working untouched.
	 */
	const Pagination: (props: Record<string, unknown>) => unknown;
	export default Pagination;
}
