---
title: Removing a domain
description: Detach a domain from a project and clean up its DNS records.
---

Removing a domain stops Nimbus routing requests for it and revokes the TLS
certificate issued for it.

## Detach the domain

In **Settings → Domains**, remove the domain from the project. Requests to it
begin failing immediately, so schedule the change if the domain is in use.

## Clean up DNS

Delete the `A` or `CNAME` records you created at your registrar. Records left
pointing at the Nimbus edge address will resolve to an error page rather than
to your project.

## Re-adding later

A removed domain can be added again at any time. Verification runs from scratch
and a new certificate is issued, so allow for nameserver propagation again.
