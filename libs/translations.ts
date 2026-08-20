/**
 * UI strings, injected through Starlight's `i18n:setup` hook so they land in
 * `Astro.locals.t()` alongside Starlight's own — and so a site can override any
 * of them from its own `i18n` collection without touching this package.
 *
 * Locales fall back to `en` when a key is missing, so partial translations are
 * fine. PRs adding a language are welcome.
 */
export const translations = {
	en: { 'relatedArticles.title': 'Related articles' },
	ar: { 'relatedArticles.title': 'مقالات ذات صلة' },
	ca: { 'relatedArticles.title': 'Articles relacionats' },
	cs: { 'relatedArticles.title': 'Související články' },
	da: { 'relatedArticles.title': 'Relaterede artikler' },
	de: { 'relatedArticles.title': 'Verwandte Artikel' },
	es: { 'relatedArticles.title': 'Artículos relacionados' },
	fa: { 'relatedArticles.title': 'مقالات مرتبط' },
	fi: { 'relatedArticles.title': 'Aiheeseen liittyvät artikkelit' },
	fr: { 'relatedArticles.title': 'Articles liés' },
	he: { 'relatedArticles.title': 'מאמרים קשורים' },
	hi: { 'relatedArticles.title': 'संबंधित लेख' },
	id: { 'relatedArticles.title': 'Artikel terkait' },
	it: { 'relatedArticles.title': 'Articoli correlati' },
	ja: { 'relatedArticles.title': '関連記事' },
	ko: { 'relatedArticles.title': '관련 문서' },
	nl: { 'relatedArticles.title': 'Gerelateerde artikelen' },
	nb: { 'relatedArticles.title': 'Relaterte artikler' },
	pl: { 'relatedArticles.title': 'Powiązane artykuły' },
	pt: { 'relatedArticles.title': 'Artigos relacionados' },
	ru: { 'relatedArticles.title': 'Похожие статьи' },
	sv: { 'relatedArticles.title': 'Relaterade artiklar' },
	tr: { 'relatedArticles.title': 'İlgili makaleler' },
	uk: { 'relatedArticles.title': 'Схожі статті' },
	vi: { 'relatedArticles.title': 'Bài viết liên quan' },
	'zh-CN': { 'relatedArticles.title': '相关文章' },
	'zh-TW': { 'relatedArticles.title': '相關文章' },
};
