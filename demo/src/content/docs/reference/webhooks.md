---
title: Webhooks reference
description: Events Nimbus posts to your endpoint, and their payloads.
---

Register an endpoint under **Settings → Webhooks** and Nimbus posts a JSON body
for each subscribed event.

## Signing

Every request carries a `Nimbus-Signature` header: an HMAC-SHA256 of the raw
body using your webhook secret. Compare it in constant time and reject any
request that does not match.

## Events

`deployment.succeeded` and `deployment.failed` fire once per deployment.
`domain.verified` fires when a domain's DNS records first resolve.

## Retries

A non-2xx response is retried with exponential backoff for up to 24 hours.
Endpoints must be idempotent: a retried delivery repeats the original payload,
including its event id.
