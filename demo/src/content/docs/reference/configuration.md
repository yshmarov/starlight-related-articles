---
title: Configuration reference
description: Every key accepted in nimbus.config.mjs.
---

Nimbus reads `nimbus.config.mjs` from the project root at build time.

## `output`

Directory written by the build. Defaults to `dist`. A relative path is resolved
against the project root.

## `redirects`

An object mapping source paths to destinations. Sources are matched before the
build output is consulted, so a redirect can shadow a generated page.

## `headers`

An array of rules, each with a `source` glob and a `headers` object. Rules are
applied in order and later rules win, which makes it easy to set a broad default
and then override one path.
