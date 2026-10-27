# Direct checkout to ECPay

The ticket login buttons explicitly continue to payment. A fresh, same-tab purchase intent is stored with the selected count before OAuth. After the server-verified member callback provides contact fields, valid forms create one order and immediately start ECPay; missing fields pause for completion. A canceled callback, expired draft or ordinary membership link never automatically orders.

Manual ticket and sponsor submissions also move directly to ECPay. The receipt is retained as a recovery view when payment cannot open. Retrying payment reuses the current order. Server-calculated payment fields are submitted only to ECPay's exact HTTPS production/stage AioCheckOut/V5 endpoints; ticket amounts must match the amount shown before submission.

`fobi-payment` v4 adds only the read-only `GET ?action=status` response: provider, mode, readiness and cashier hostname. It exposes no merchant identifier, keys, signing material or customer data. Existing start, signed callback, amount checks and paid-ticket issuing logic are preserved.

On 2026-10-26 the live status reports `mode: stage`, `ready: true`. This is a test cashier, not formal collection. Production requires securely configured `ECPAY_MODE=production`, `ECPAY_MERCHANT_ID`, `ECPAY_HASH_KEY` and `ECPAY_HASH_IV`, followed by an authorized real transaction/callback validation. Never place these values in source, chat or frontend code.

Validation: existing member tests plus payment destination/amount/intent unit tests, Vite build, and browser tests with intercepted order/payment requests for login-to-cashier, missing data, cancel/refresh, retry and sponsor flows. No real orders or deductions are created by these tests.

## Formal collection activation — checked 2026-10-27

The live read-only status now also returns `production_ready` and `missing_production_settings`, containing variable names only. Inspection found all three formal merchant variables absent in the payment runtime, and no ECPay variable names configured in the FOBI Vercel project. No credential values were read or exposed.

Set these values through the project's Edge Function Secrets interface at https://supabase.com/dashboard/project/tlpsqaywjcgowprhauod/functions/secrets:

- `ECPAY_MERCHANT_ID`: the actual production merchant ID supplied by ECPay.
- `ECPAY_HASH_KEY`: the production signing key supplied by ECPay.
- `ECPAY_HASH_IV`: the production signing IV supplied by ECPay.
- `ECPAY_MODE`: `production`.

After configuration, verify `GET https://tlpsqaywjcgowprhauod.supabase.co/functions/v1/fobi-payment?action=status` reports `mode=production`, `production_ready=true`, `ready=true` and `payment_host=payment.ecpay.com.tw`. Credentials being present is not proof of a successful transaction; verify an authorized real transaction and signed callback separately. Do not place merchant credentials in this repository or conversations.
