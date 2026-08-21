---
title: Verifying DNS records
description: Check that a domain's DNS records resolve before Nimbus issues a certificate.
---

Nimbus polls a domain's DNS records every few minutes until they resolve, then
issues a TLS certificate. This page covers what to check when they do not.

## Confirm the record type

An apex domain needs an `A` record; a subdomain needs a `CNAME`. A domain with
both will fail verification, because resolvers may return either one.

## Watch for registrar caching

Nameserver changes are visible to Nimbus as soon as your registrar publishes
them, but resolvers cache the previous answer for the record's TTL. Lower the
TTL before changing records if you need the switch to be quick.

## Check for conflicting records

A `CAA` record that does not authorise our certificate authority will block
issuance even once the `A` or `CNAME` resolves correctly. Remove it or add our
authority to it.
