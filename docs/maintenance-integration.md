# Maintenance frontend integration — 21 September 2026

## Delivered

- Accounts (/maintenance): resident/staff date-filtered statements, staff signed adjustments with stable retry keys, occupancy confirmation/end/history, and paginated audit snapshots.
- Monthly billing: both dashboard Create bill and Bills Generate Bill now use the same preview/generate form. Separate charges, selected/all flats, due dates, duplicate skipping, and preview invalidation after editing.
- Payments: optional private proof uploaded before submit; normalized references up to 100 characters; Rejected is terminal, Failed retains staff retry; server receipt JSON supplies receipt number, amount, reference, flat, and date for PDF export.
- Submission errors remain visible. Refresh only reads transaction status; it does not silently resubmit financial writes. Explicit retries reuse the stored creation key and payment ID.
- Expenses: retained multipart creation/invoice download; cancellation wording replaces deletion; staff approval/rejection, bank debit entry/listing and one-to-one matching.
- Inbox (/notifications): paginated, polls every 30 seconds while visible, explicitly marks notifications read. Delivered/fetched is not described as push delivery.
- Reminders queue in-app notifications and report queued count. No WhatsApp action is exposed or enabled.
- Authenticated file paths beginning /api/ are normalized before passing them to the existing /api Axios base URL. Financial writes do not use automatic network retries.
- All new flows fit mobile and desktop and expose backend validation/access/conflict messages.

## Payment discovery — 22 September 2026

Integrated GET /payment-transactions using its items/totalCount/skip/take envelope. Payment activity supports cross-device discovery, bill/flat/status filters, pagination, and server proofAvailable/receiptAvailable flags. Submitted payments discovered on the server disable duplicate payment actions; bill receipt lookup discovers verified payments without a locally saved transaction ID. Lookup by payment ID remains available.

The supplied specification is saved in docs/openapi.json. Accounts, notifications, expense review/reconciliation, billing, and private files already have integrations. Legacy bill create/bulk/pay operations are superseded by monthly preview/generate and verified payment transactions. The optional WhatsApp endpoint remains disabled as documented by the API. The mark-synced operation is not called merely for reading payment history.

## Rollout requirements

Apply the supplied backend migration using the team's normal reviewed deployment process, reconcile preflight failures, and confirm occupancy for residents who need statement access. This frontend work did not apply a database migration or send real reminders.

The backend handoff and source were used to resolve response shapes omitted by OpenAPI, notably expense invoiceUrl/status, bank expenseId, and occupancy dates.

## Verification

Browser tests mock the supplied API contracts: statement access/filters/adjustment retry keys, billing previews, occupancy, audit, inbox paging/read, expense review/matching, proof order, receipt JSON, rejection and in-app reminders. Existing mobile/payment/contrast regression checks also run.

Live authenticated acceptance against the migrated backend remains a deployment check. The browser contract suite does not prove database migration state, signature validation, delivery, concurrency enforcement or production data correctness.
