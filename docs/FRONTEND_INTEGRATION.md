# SurShaktiConnect frontend API handoff

The API contract is in `openapi.json` and follows OpenAPI 3.0.1.

## Base URL and authentication

- Local API base URL: `http://localhost:5236/api`
- Protected operations use `Authorization: Bearer <JWT>`.
- Swagger marks each protected operation with the `Bearer` security scheme.
- Error responses use RFC 7807 `ProblemDetails` where documented.

## Payment workflow

1. `POST /api/payment-transactions/create`
2. `POST /api/payment-transactions/{id}/submit`
3. Staff verifies with `POST /api/payment-transactions/{id}/verify`.

`amountPaid` must equal `amount + penaltyAmount`. Reusing an idempotency key is allowed only
for the same user, bill, amount, and payment mode. Staff cash payments can use
`POST /api/payment-transactions/admin/{id}/manual-verify`.

## Expense receipts

Expense responses return a `receiptUrl` such as `/Expense/42/receipt`. Request it through the
configured Axios API client so the Bearer token is included, and handle the response as a Blob.
A plain browser link will not include the authentication header.

## Resident imports and passwords

- `POST /api/Auth/import-residents` accepts an `.xlsx` file up to 5 MB.
- Imported residents receive an individual password setup link by email.
- Staff can retry delivery with `POST /api/Auth/resend-invitation`.
- The setup page submits to `POST /api/Auth/reset-password`.

## Upload constraints

- Profile photos: JPEG, PNG, or WebP, maximum 5 MB.
- Expense receipts: JPEG, PNG, WebP, or PDF, maximum 5 MB.
- The server validates both extension and file signature.

## Importing the contract

Use `openapi.json` with Swagger UI, Postman, NSwag, Orval, OpenAPI Generator, or another
OpenAPI 3 compatible client generator. Keep generated clients aligned with the documented
request and response schemas rather than duplicating hand-written types.
