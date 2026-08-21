import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AstroIntegration } from 'astro';
import type { StarlightPlugin, StarlightUserConfig } from '@astrojs/starlight/types';
import { configSchema, type RuntimeConfig, type StarlightRelatedArticlesUserConfig } from './libs/config.ts';
import { sourceLocaleToPrefix } from './libs/locale.ts';
import { translations } from './libs/translations.ts';

const PLUGIN_NAME = 'starlight-related-articles';
const CONFIG_MODULE = 'virtual:starlight-related-articles/config';
const USER_PAGINATION_MODULE = 'virtual:starlight-related-articles/user-pagination';

export default function starlightRelatedArticles(
	userConfig?: StarlightRelatedArticlesUserConfig
): StarlightPlugin {
	const parsed = configSchema.safeParse(userConfig ?? {});
	if (!parsed.success) {
		throw new Error(
			`Invalid \`${PLUGIN_NAME}\` config:\n` +
				parsed.error.issues.map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`).join('\n')
		);
	}
	const config = parsed.data;

	return {
		name: PLUGIN_NAME,
		hooks: {
			'i18n:setup'({ injectTranslations }) {
				injectTranslations(translations);
			},
			'config:setup'({ addIntegration, addRouteMiddleware, config: starlightConfig, logger, updateConfig }) {
				if (config.sourceLocale !== undefined) {
					const known = Object.keys(starlightConfig.locales ?? {});
					if (known.length > 0 && !known.includes(config.sourceLocale)) {
						logger.warn(
							`\`sourceLocale: '${config.sourceLocale}'\` is not one of your configured locales ` +
								`(${known.join(', ')}). Related articles will be empty — did you mean 'root'?`
						);
					}
				}

				const runtimeConfig: RuntimeConfig = {
					count: config.count,
					neighbors: Math.max(config.neighbors, config.count),
					titleWeight: config.titleWeight,
					minTermLength: config.minTermLength,
					stopWords: config.stopWords,
					minScore: config.minScore,
					dedupeByTitle: config.dedupeByTitle,
					fallback: config.fallback,
					sourceLocale: config.sourceLocale,
					exclude: config.exclude,
					showTrail: config.showTrail,
					trailSeparator: config.trailSeparator,
					trailIcon: config.trailIcon,
					localeKeys: localeKeys(starlightConfig.locales),
					sourceLocalePrefix: sourceLocaleToPrefix(config.sourceLocale),
				};

				addRouteMiddleware({ entrypoint: `${PLUGIN_NAME}/middleware`, order: 'post' });

				// Resolved before any component override is registered below, so it
				// captures the *previous* owner of the Pagination slot.
				const previousPagination = starlightConfig.components?.Pagination;

				if (config.injectComponent) {
					updateConfig({
						components: {
							...starlightConfig.components,
							Pagination: `${PLUGIN_NAME}/components/Pagination.astro`,
						},
					});
				}

				addIntegration(
					relatedArticlesIntegration({
						runtimeConfig,
						previousPagination,
						injectComponent: config.injectComponent,
					})
				);
			},
		},
	};
}

/** Locale directory names, excluding the root locale (which has no directory). */
function localeKeys(locales: StarlightUserConfig['locales']): string[] {
	if (!locales) return [];
	return Object.keys(locales).filter((key) => key !== 'root');
}

function relatedArticlesIntegration(options: {
	runtimeConfig: RuntimeConfig;
	previousPagination: string | undefined;
	injectComponent: boolean;
}): AstroIntegration {
	const { runtimeConfig, previousPagination, injectComponent } = options;

	return {
		name: `${PLUGIN_NAME}/integration`,
		hooks: {
			'astro:config:setup'({ config: astroConfig, updateConfig }) {
				// Starlight resolves component overrides relative to the project
				// root, so the captured path has to be resolved the same way before
				// it can be re-exported from a virtual module.
				const resolveComponent = (id: string) =>
					id.startsWith('.') ? resolve(fileURLToPath(astroConfig.root), id) : id;

				updateConfig({
					vite: {
						plugins: [
							{
								name: `vite-plugin-${PLUGIN_NAME}`,
								resolveId(id) {
									if (id === CONFIG_MODULE || id === USER_PAGINATION_MODULE) return `\0${id}`;
									return undefined;
								},
								load(id) {
									if (id === `\0${CONFIG_MODULE}`) {
										return `export default ${JSON.stringify(runtimeConfig)};`;
									}
									if (id === `\0${USER_PAGINATION_MODULE}`) {
										// Re-export whichever component owned the Pagination slot
										// before this plugin, so the override chain is preserved.
										const target =
											(injectComponent ? previousPagination : undefined) ??
											'@astrojs/starlight/components/Pagination.astro';
										return `export { default } from ${JSON.stringify(resolveComponent(target))};`;
									}
									return undefined;
								},
							},
						],
					},
				});
			},
		},
	};
}

export type { StarlightRelatedArticlesUserConfig } from './libs/config.ts';
export type { RelatedArticle } from './libs/resolve.ts';
