---
title: Connecting a domain
description: Point an existing domain at your Nimbus project and verify it.
---

To serve your project from a domain you already own, add the domain in **Settings
→ Domains**, then update its DNS records at your registrar.

## Add the domain

Enter the domain exactly as you want it served, without a scheme. Nimbus shows
the DNS records to create as soon as the domain is added.

## Update DNS

Create the records your registrar requires. An apex domain needs an `A` record
pointing at the Nimbus edge address; a subdomain needs a `CNAME` pointing at
your project hostname. Nameserver changes take effect within a few hours,
though registrars may cache them for up to 48 hours.

## Verify

Nimbus checks the records every few minutes and issues a TLS certificate once
they resolve. Until verification completes the domain is listed as pending and
requests are not routed to your project.
