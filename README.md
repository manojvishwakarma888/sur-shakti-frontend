# Sur Shakti Connect

React and Vite frontend for the Sur Shakti society, with a Capacitor Android shell.

## Run locally

```sh
npm install
npm run dev
```

The default backend is `http://localhost:5236/api`. Copy `.env.example` to `.env.local` to set `VITE_BACKEND_URL` to a different backend origin (without `/api`). Restart Vite after changing it. A phone needs an address reachable from that device; localhost refers to the phone itself. Backend CORS and Android network configuration must support that origin.

## Checks

```sh
npm run build
npm test
npx playwright install chromium
npm run test:ui
npm run lint
```

Browser tests use mocked API responses and cover narrow layouts, drawer focus, payment pending/error states, account-specific retries, and PDF downloads. They do not verify actual UPI transfers or backend authorization. Existing source lint findings remain; generated Android assets and test output are excluded.

## Mobile UX

- Bottom navigation keeps Home, Bills, Notices and Help within reach.
- The drawer supports Escape, focus containment and focus restoration.
- Payment sheets support same-phone UPI links, QR scanning and reference submission with real pending feedback.
- Bills distinguish load errors from empty results, with a retry action and outstanding summary.
- Controls accommodate touch, safe areas, keyboard focus and reduced motion.
- PDF generation libraries load only when downloading a receipt.

## Next improvements

- Add server-sourced payment review statuses so residents can distinguish awaiting verification from unpaid bills.
- Extend explicit loading, cached-data and retry feedback to notices, the directory and dashboards.
- Move remaining browser-local offline data to account-specific storage.
- Confirm the Admin/Secretary permission model with the backend before changing action visibility.
- Validate the Android build on a physical device, including UPI app handoff, keyboard behavior and receipt downloads.
- Configure deployment-specific API and society payment details; the UPI payee remains the existing project configuration.
