---
title: DNS records reference
description: Every DNS record Nimbus asks you to create, and why.
---

Nimbus shows the exact records to create when you add a domain. This page
explains what each one does.

## `A`

Points an apex domain at the Nimbus edge address. Required for a domain served
without a subdomain, because a `CNAME` is not valid at a zone apex.

## `CNAME`

Points a subdomain at your project hostname. Preferred wherever it is valid: the
target can change without you editing the record.

## `CAA`

Optional, but if present it must authorise our certificate authority or
certificate issuance fails. Nimbus reports this as a verification error rather
than a DNS error.

## `TXT`

Used only for domain ownership challenges on domains whose nameservers Nimbus
cannot query directly.
