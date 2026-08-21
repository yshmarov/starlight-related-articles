---
title: Sending email
description: Configure an SMTP provider so your project can send mail.
---

Nimbus does not deliver mail itself. Connect an SMTP provider and Nimbus relays
through it.

## Add credentials

Enter the host, port, username and password from your provider under
**Settings → Email**. Credentials are encrypted at rest and never shown again
after saving.

## Choose a sender address

The sender address must be on a domain your provider is authorised to send for.
Most providers require SPF and DKIM records before they will accept mail for a
domain.

## Test delivery

Send a test message from the settings screen. Failures are reported with the
provider's own SMTP response, which is usually enough to identify a rejected
sender or a bad password.
