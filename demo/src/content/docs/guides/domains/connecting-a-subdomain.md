---
title: Connecting a subdomain
description: Serve a project from a subdomain of a domain you already use.
---

A subdomain is connected the same way as an apex domain, but needs a single
`CNAME` record rather than an `A` record.

## Add the subdomain

Add the full hostname — `docs.example.com`, not `docs` — in **Settings →
Domains**. Nimbus treats each subdomain as its own domain, so several projects
can share one registered domain.

## Create the CNAME

Point the subdomain at your project hostname. Do not create an `A` record as
well; conflicting records make verification fail and the domain stays pending.

## Verify

Verification and certificate issuance work exactly as they do for an apex
domain. Nameserver propagation is usually faster for subdomains because fewer
resolvers cache them.
