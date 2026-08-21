---
title: CLI reference
description: Every nimbus subcommand and its flags.
---

Install the CLI with your package manager, then run `nimbus --help` for the
short version of this page.

## `nimbus dev`

Starts a local server with hot reloading. `--port` overrides the default port
and `--host` exposes the server on your network.

## `nimbus build`

Produces a production build in the `output` directory. `--verbose` prints the
per-file timings that the build summary aggregates.

## `nimbus deploy`

Uploads the most recent build. `--prebuilt` skips building and uploads the
existing output directory as-is, which is what CI pipelines usually want.
