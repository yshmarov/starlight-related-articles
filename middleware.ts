import { defineRouteMiddleware } from '@astrojs/starlight/route-data';
import config from 'virtual:starlight-related-articles/config';
import { resolveRelatedArticles } from './libs/resolve.ts';

/**
 * Attach the current page's related articles to Starlight's route data, so the
 * bundled component stays presentational — and so you can read
 * `Astro.locals.starlightRoute.relatedArticles` from your own components,
 * overrides, or route middleware instead of using the component at all.
 */
export const onRequest = defineRouteMiddleware(async (context) => {
  const route = context.locals.starlightRoute;

  route.relatedArticles = await resolveRelatedArticles({
    config,
    // `entry.id` is the content that supplies this page's text — on a page using
    // fallback content that is the default-locale entry, not the localized route.
    entryId: route.entry.id,
    routeId: route.id,
    locale: route.locale,
    pathname: context.url.pathname,
    title: route.entry.data.title,
    sidebar: route.sidebar,
  });
});
