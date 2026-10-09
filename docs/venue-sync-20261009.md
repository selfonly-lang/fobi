# FOBI 2026 venue synchronization — 2026-10-09

Authority: merged PR #4, commit 905cff7713aaf4d1005e7b099e0e61dfb319f513.
Confirmed grand-final venue: 臺北新板希爾頓酒店. Date: 2026-10-30.
No floor, ballroom, address, or After Party venue has been inferred.

## Findings and changes

- Homepage EventBar/footer and event.html already use the confirmed venue.
- Add date and grand-final venue to tickets.html, sponsors.html, sponsor-center.html, both checkout modes, the order-created receipt, payment-result.html, ticket.html, and checkin.html.
- Existing ticket serials, QR tokens, admission entitlements, and check-in logic are unchanged. ticket.html currently displays the QR token as text; this change does not claim to add a scannable QR image.
- Live fobi_site_config row `main` and pageant_events row `fobi-2026` still contained 臺北茹曦酒店 2F. Updated both existing rows to the confirmed venue and recorded a fobi_admin_audit entry. Read-back verified both.
- The public pageant API returned the old venue before correction, affecting pageant.html, pageants.html, and apply.html.

## Tickets and notifications

At audit time the connected database contained one pending order and zero issued tickets. No recipient contact data was exported.
Inspected deployed fobi-public v11, fobi-payment v3, fobi-admin v5 and FOBI SQL functions/order triggers: no mail/notification sender or template was found. The database has no notification/mail/outbox tables in inspected application schemas. The repository has no existing outbound notification templates.
These findings do not establish that no external or manually sent notifications exist. External Email/LINE/Make/social publishing records and previously distributed image/PDF materials remain unverified; no correction messages have been sent. Identify exact messages containing the old venue and their actual recipients before sending a correction. Do not treat the single pending order as evidence of a sent message.
