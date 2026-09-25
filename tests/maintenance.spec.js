import { Buffer } from 'node:buffer';
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function setup(page, role = 'Admin') {
  const payload = Buffer.from(JSON.stringify({ sub: 'resident-1', role, FullName: 'Test Resident', FlatNo: 'A-101' })).toString('base64url');
  await page.context().addCookies([{ name: 'token', value: 'e30.' + payload + '.test', url: 'http://127.0.0.1:5174' }]);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname.toLowerCase();
    if (path.endsWith('/payment-transactions')) return route.fulfill({ json: { items: [], totalCount: 0, skip: 0, take: 50 } });
    if (path.endsWith('/bill')) return route.fulfill({ json: [{ billId: 42, amount: 500, penaltyAmount: 25, month: '2026-09', isPaid: false, userId: 'resident-1', flatNo: 'A-101' }] });
    if (path.endsWith('/auth/all-residents')) return route.fulfill({ json: [{ id: 'resident-1', fullName: 'Test Resident', flatNo: 'A-101' }] });
    if (path.endsWith('/dashboard/stats')) return route.fulfill({ json: {} });
    if (path.endsWith('/current-user')) return route.fulfill({ json: {} });
    return route.fulfill({ json: [] });
  });
}
const statement = { flatNo: 'A-101', openingBalance: 100, charges: 500, penalties: 25, verifiedPayments: 525, adjustments: -10, closingBalance: 90, entries: [{ id: 1, date: '2026-09-21', kind: 'Payment', description: 'Receipt SSC-8', debit: 0, credit: 525, balance: 90 }] };

test('statement filters, signed adjustment, and retry idempotency', async ({ page }) => {
  await setup(page);
  let adjustment;
  let keys = [];
  await page.route('**/api/maintenance/flats/A-101/statement?*', async route => {
    expect(new URL(route.request().url()).searchParams.get('from')).toBe('2026-09-01');
    await route.fulfill({ json: statement });
  });
  await page.route('**/api/maintenance/flats/A-101/adjustments', async route => {
    adjustment = route.request().postDataJSON(); keys.push(adjustment.idempotencyKey);
    await route.fulfill({ status: keys.length === 1 ? 409 : 200, json: keys.length === 1 ? { detail: 'Concurrent change. Retry.' } : { id: 5 } });
  });
  await page.goto('/maintenance');
  await page.getByLabel('From', { exact: true }).fill('2026-09-01');
  await page.getByLabel('To', { exact: true }).fill('2026-09-30');
  await page.getByRole('button', { name: 'View statement' }).click();
  await expect(page.getByText('₹90.00').first()).toBeVisible();
  await page.getByLabel('Signed amount').fill('-10');
  await page.getByLabel('Adjustment reason').fill('Approved credit');
  page.on('dialog', d => d.accept());
  await page.getByRole('button', { name: 'Post adjustment' }).click();
  await expect(page.getByRole('alert')).toContainText('Concurrent change');
  await page.getByRole('button', { name: 'Post adjustment' }).click();
  await expect(page.getByRole('status')).toContainText('Adjustment posted');
  expect(adjustment.amount).toBe(-10);
  expect(keys[0]).toBe(keys[1]);
});

test('resident statement denial is actionable and staff sections are hidden', async ({ page }) => {
  await setup(page, 'Resident');
  await page.route('**/api/maintenance/flats/*/statement', route => route.fulfill({ status: 403, json: { detail: 'Forbidden' } }));
  await page.goto('/maintenance');
  await expect(page.getByRole('button', { name: 'Billing', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'View statement' }).click();
  await expect(page.getByRole('alert')).toContainText('resident assignment confirmed');
});

test('monthly generation requires a fresh preview and preserves duplicate rows', async ({ page }) => {
  await setup(page);
  let request;
  await page.route('**/api/maintenance/billing/preview', async route => {
    request = route.request().postDataJSON();
    await route.fulfill({ json: [{ flatNo: 'A-101', chargeType: 'Maintenance', amount: 500, alreadyExists: true }, { flatNo: 'A-102', chargeType: 'Maintenance', amount: 500, alreadyExists: false }] });
  });
  await page.route('**/api/maintenance/billing/generate', async route => {
    expect(route.request().postDataJSON()).toEqual(request);
    await route.fulfill({ json: { created: 1, skipped: 1, rows: [] } });
  });
  await page.goto('/maintenance');
  await page.getByRole('button', { name: 'Billing', exact: true }).click();
  await page.getByLabel('Billing month').fill('2026-10');
  await page.getByLabel('Due date').fill('2026-10-08');
  await page.getByLabel('Row house numbers').fill('a-101, A-102');
  await page.getByLabel('Amount 1').fill('500');
  await page.getByRole('button', { name: 'Preview bills' }).click();
  await expect(page.getByText('Already exists — skip')).toBeVisible();
  await page.getByLabel('Amount 1').fill('600');
  await expect(page.getByRole('button', { name: 'Generate previewed bills' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Preview bills' }).click();
  await page.getByRole('button', { name: 'Generate previewed bills' }).click();
  await expect(page.getByRole('status')).toContainText('Created 1 bills; skipped 1');
  expect(request.flatNumbers).toEqual(['A-101', 'A-102']);
  expect(request.charges[0].amount).toBe(600);
});

test('occupancy confirms and ends the selected flat assignment', async ({ page }) => {
  await setup(page);
  let rows = [];
  await page.route(/\/api\/maintenance\/flats\/A-101\/occupancies(?:\/end)?(?:\?.*)?$/, async route => {
    if (route.request().method() === 'POST') {
      if (route.request().url().endsWith('/end')) rows[0].endsAt = '2026-09-22';
      else {
        expect(route.request().postDataJSON()).toEqual({ userId: 'resident-1', residentType: 'Tenant' });
        rows = [{ id: 1, userId: 'resident-1', residentType: 'Tenant', startsAt: '2026-09-21', endsAt: null }];
      }
    }
    await route.fulfill({ json: rows });
  });
  await page.goto('/maintenance');
  await page.getByRole('button', { name: 'Resident assignment', exact: true }).click();
  await page.getByLabel('Row house number').fill('A-101');
  await page.getByRole('button', { name: 'Load assignment' }).click();
  await page.getByLabel('Billing resident').selectOption('resident-1');
  await page.getByLabel('Resident type').selectOption('Tenant');
  page.on('dialog', d => d.accept());
  await page.getByRole('button', { name: 'Confirm assignment' }).click();
  await expect(page.getByText('Test Resident · Tenant')).toBeVisible();
  await page.getByRole('button', { name: 'End current assignment' }).click();
  await expect(page.getByRole('button', { name: 'End current assignment' })).toBeDisabled();
});

test('audit automatically loads readable activity and filters records', async ({ page }) => {
  await setup(page);
  let filtered = false;
  await page.route('**/api/maintenance/audit?*', async route => {
    const params = new URL(route.request().url()).searchParams;
    if (params.get('entity')) {
      expect(params.get('entity')).toBe('Transaction');
      expect(params.get('recordId')).toBe('8');
      filtered = true;
    }
    await route.fulfill({ json: [{ id: 2, at: '2026-09-21', actorId: 'resident-1', entity: 'Transaction', recordId: '8', action: 'Modified', before: '{"status":"Submitted"}', after: '{"status":"Verified"}' }] });
  });
  await page.goto('/maintenance');
  await page.getByRole('button', { name: 'Audit', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Payment updated', exact: true })).toBeVisible();
  await expect(page.getByText(/Changed by Test Resident/)).toBeVisible();
  await page.getByLabel('Show activity for').selectOption('Transaction');
  await page.getByText('Find a specific record (optional)', { exact: true }).click();
  await page.getByLabel('Record number').fill('8');
  await page.getByRole('button', { name: 'Show activity', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Payment updated', exact: true })).toBeVisible();
  expect(filtered).toBe(true);
  await page.getByText('View changes', { exact: true }).click();
  await expect(page.locator('.audit-change')).toContainText('Submitted');
  await expect(page.locator('.audit-change')).toContainText('Verified');
  await expect(page.locator('pre')).toHaveCount(0);
  await expect(page.getByText('Technical details', { exact: true })).toHaveCount(0);
});

test('audit explains adjustments and assignments without exposing raw IDs by default', async ({ page }) => {
  await setup(page);
  await page.setViewportSize({ width: 320, height: 740 });
  await page.route('**/api/maintenance/audit?*', route => route.fulfill({ json: [
    { id: 1, entity: 'FlatLedgerEntry', recordId: '36', action: 'Added', actorId: 'resident-1', at: '2026-09-22T05:46:20Z', before: null, after: JSON.stringify({ Id: 36, FlatNo: '52', Amount: 10, Kind: 'Adjustment', Description: 'Audit testing', SourceKey: 'adjustment:private-key' }) },
    { id: 2, entity: 'Occupancy', recordId: '1', action: 'Added', actorId: 'unknown-user', at: '2026-09-22T05:39:54Z', after: JSON.stringify({ FlatNo: '52', ResidentType: 'Owner', UserId: 'resident-1', EndsAt: null }) },
    { id: 3, entity: 'UnknownEntity', recordId: '3', action: 'Modified', actorId: null, at: '2026-09-22', before: 'not-json', after: '{invalid' }
  ] }));
  await page.goto('/maintenance');
  await page.getByRole('button', { name: 'Audit', exact: true }).click();
  await expect(page.getByRole('heading', { name: '₹10.00 adjustment added for Row house 52' })).toBeVisible();
  await expect(page.getByText('Added to the amount owed.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Resident assignment added for Row house 52' })).toBeVisible();
  await expect(page.locator('pre')).toHaveCount(0);
  await page.getByText('View changes', { exact: true }).nth(1).click();
  await expect(page.locator('.audit-change').filter({ hasText: 'Resident type' })).toContainText('Owner');
  await expect(page.getByRole('heading', { name: 'Record updated' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('inbox paginates and marks read only on request', async ({ page }) => {
  await setup(page, 'Resident');
  let reads = 0;
  await page.route('**/api/notifications?*', async route => {
    const skip = Number(new URL(route.request().url()).searchParams.get('skip'));
    await route.fulfill({ json: skip ? [{ id: 51, kind: 'Bill', message: 'Older bill', createdAt: '2026-09-20', readAt: null }] : Array.from({ length: 50 }, (_, i) => ({ id: i + 1, kind: 'Bill', message: 'Bill update ' + (i + 1), createdAt: '2026-09-21', readAt: null })) });
  });
  await page.route('**/api/notifications/1/read', async route => { reads++; await route.fulfill({ json: {} }); });
  await page.goto('/notifications');
  await expect(page.getByText('Bill update 1', { exact: true })).toBeVisible();
  expect(reads).toBe(0);
  await page.getByRole('button', { name: 'Mark as read' }).first().click();
  await expect(page.getByText('Read', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.getByText('Older bill')).toBeVisible();
  expect(reads).toBe(1);
});

test('expense review, bank entry and matching use workflow endpoints', async ({ page }) => {
  await setup(page);
  let status = 'Submitted';
  let bank = [];
  await page.route('**/api/maintenance/expenses?*', route => route.fulfill({ json: [{ id: 5, title: 'Lift service', amount: 1500, category: 'Repairs', date: '2026-09-21', status }] }));
  await page.route('**/api/maintenance/expenses/5/review', async route => { expect(route.request().postDataJSON().approved).toBe(true); status = 'Approved'; await route.fulfill({ json: { id: 5, status } }); });
  await page.route('**/api/maintenance/expenses/bank-records*', async route => {
    if (route.request().method() === 'POST') bank = [{ id: 3, ...route.request().postDataJSON(), expenseId: null }];
    await route.fulfill({ json: bank });
  });
  await page.route('**/api/maintenance/expenses/5/match/3', async route => { bank[0].expenseId = 5; await route.fulfill({ json: { id: 3, expenseId: 5 } }); });
  await page.goto('/expenses');
  await page.getByRole('button', { name: 'Reject', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('reason');
  await page.getByRole('button', { name: 'Approve', exact: true }).click();
  await expect(page.getByText('Approved', { exact: true })).toBeVisible();
  await page.getByLabel('Bank reference').fill('BANK-DEBIT-001');
  await page.getByLabel('Bank date').fill('2026-09-21');
  await page.getByLabel('Debit amount').fill('1500');
  await page.getByRole('button', { name: 'Add bank record' }).click();
  await page.getByLabel('Bank record for expense 5').selectOption('3');
  await page.getByRole('button', { name: 'Match debit' }).click();
  await expect(page.getByText('Matched to bank record BANK-DEBIT-001')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Cancel expense', exact: true })).toBeDisabled();
});

test('payment proof uploads before submission and receipt uses authenticated JSON', async ({ page }) => {
  await setup(page, 'Resident');
  const calls = [];
  let transaction = { transactionId: 8, billId: 42, amountPaid: 525, status: 'Created' };
  await page.route('**/api/payment-transactions?*', route => {
    const status = new URL(route.request().url()).searchParams.get('status');
    const items = status && status !== transaction.status ? [] : [transaction];
    return route.fulfill({ json: { items, totalCount: items.length, skip: 0, take: 50 } });
  });
  await page.route('**/api/payment-transactions/**', async route => {
    const path = new URL(route.request().url()).pathname;
    expect(route.request().headers().authorization).toContain('Bearer ');
    if (path.endsWith('/create')) {
      expect(route.request().postDataJSON().amountPaid).toBe(525);
      calls.push('create');
    } else if (path.endsWith('/proof')) {
      expect(route.request().headers()['content-type']).toContain('multipart/form-data');
      calls.push('proof'); transaction.proofUrl = '/api/payment-transactions/8/proof';
    } else if (path.endsWith('/submit')) {
      expect(route.request().postDataJSON().transactionReferenceId).toBe('UPI-20260921-001');
      calls.push('submit'); transaction.status = 'Submitted';
    } else if (path.endsWith('/receipt')) {
      return route.fulfill({ json: { receiptNumber: 'SSC-8', transactionId: 8, billId: 42, flatNo: 'A-101', month: '2026-09', amountPaid: 525, paymentMode: 'UPI', transactionReferenceId: 'UPI-20260921-001', issuedAt: '2026-09-21' } });
    }
    await route.fulfill({ json: transaction });
  });
  await page.goto('/my-bills');
  await page.getByRole('button', { name: 'Pay Now' }).filter({ visible: true }).click();
  await page.getByRole('button', { name: "I've paid" }).click();
  await page.getByLabel('Transaction reference (UTR)').fill('UPI-20260921-001');
  await page.getByLabel('Payment proof (optional)').setInputFiles({ name: 'proof.png', mimeType: 'image/png', buffer: Buffer.from('test image') });
  await page.getByRole('button', { name: 'Submit for review' }).click();
  await expect(page.getByRole('dialog', { name: 'Pay your bill' })).toHaveCount(0);
  expect(calls).toEqual(['create', 'proof', 'submit']);
  await page.getByRole('navigation', { name: 'Billing pages' }).getByRole('link', { name: 'Payment history' }).click();
  await expect(page.locator('article').getByText('Submitted', { exact: true })).toBeVisible();
  transaction.status = 'Verified';
  await page.reload();
  await page.getByRole('button', { name: 'Receipt', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Receipt Preview' })).toContainText('SSC-8');
  await expect(page.getByRole('dialog', { name: 'Receipt Preview' })).toContainText('525');
});

test('rejected payments cannot be approved or retried and reminders are in-app', async ({ page }) => {
  await setup(page);
  await page.route('**/api/payment-transactions/admin/pending-verifications', route => route.fulfill({ json: [{ transactionId: 8, billId: 42, flatNo: 'A-101', amountPaid: 525, status: 'Rejected', failureReason: 'Reference not found' }] }));
  let reminders = 0;
  await page.route('**/api/Bill/send-reminders', async route => { reminders++; await route.fulfill({ json: { channel: 'InApp', queued: 2 } }); });
  await page.goto('/payment-review');
  await expect(page.getByRole('button', { name: 'Approve', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Reject', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Retry check' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Queue in-app reminders' }).click();
  await expect(page.getByText('2 in-app reminders queued.')).toBeVisible();
  expect(reminders).toBe(1);
  await expect(page.getByRole('button', { name: /WhatsApp/ })).toHaveCount(0);
});

for (const path of ['/maintenance', '/notifications', '/expenses']) {
  test('new workflow fits 320px and has readable contrast ' + path, async ({ page }) => {
    await setup(page);
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto(path);
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const results = await new AxeBuilder({ page }).withRules(['color-contrast']).analyze();
    expect(results.violations).toEqual([]);
  });
}

test('inbox polls while open without marking messages read', async ({ page }) => {
  await setup(page, 'Resident');
  await page.clock.install();
  let requests = 0;
  await page.route('**/api/notifications?*', async route => {
    requests++;
    await route.fulfill({ json: [{ id: requests, kind: 'Bill', message: 'Update ' + requests, createdAt: '2026-09-21', readAt: null }] });
  });
  await page.goto('/notifications');
  await expect(page.getByText(/^Update [0-9]+$/)).toBeVisible();
  const beforePoll = requests;
  await page.clock.fastForward(31000);
  await expect.poll(() => requests).toBeGreaterThan(beforePoll);
  await expect(page.getByText('Update ' + requests, { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Mark as read' })).toBeVisible();
});



test('cross-device payment discovery filters, pages, and respects private file availability', async ({ page }) => {
  await setup(page, 'Resident');
  await page.route('**/api/payment-transactions?*', async route => {
    const query = new URL(route.request().url()).searchParams;
    const skip = Number(query.get('skip'));
    if (query.get('status') === 'Submitted') return route.fulfill({ json: { items: [], totalCount: 0, skip: 0, take: 50 } });
    const filtered = query.get('flatNo') === 'A-101';
    await route.fulfill({ json: { items: [{ transactionId: skip ? 900 : 800, billId: 42, status: 'Verified', amountPaid: 525, proofAvailable: false, proofUrl: '/private-proof', receiptAvailable: false }], totalCount: filtered ? 1 : 51, skip, take: 50 } });
  });
  await page.goto('/payment-history');
  await expect(page.getByText('Payment #800 · Bill #42')).toBeVisible();
  await expect(page.getByRole('button', { name: 'View proof', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Receipt', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Next payments' }).click();
  await expect(page.getByText('Payment #900 · Bill #42')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Next payments' })).toBeDisabled();
  await page.getByLabel('Filter by row house').fill(' a-101 ');
  await page.getByRole('button', { name: 'Apply filters' }).click();
  await expect(page.getByText('Page 1 · 1 payments')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Next payments' })).toBeDisabled();
});

test('submitted payments from another device prevent duplicate payment actions', async ({ page }) => {
  await setup(page, 'Resident');
  await page.route('**/api/payment-transactions?*', route => route.fulfill({ json: { items: [{ transactionId: 801, billId: 42, status: 'Submitted', amountPaid: 525 }], totalCount: 1, skip: 0, take: 50 } }));
  await page.goto('/my-bills');
  await expect(page.getByRole('button', { name: 'Pay Now' }).first()).toBeDisabled();
  await expect(page.getByText('Payment #801 · Bill #42')).toHaveCount(0);
  await page.getByRole('navigation', { name: 'Billing pages' }).getByRole('link', { name: 'Payment history' }).click();
  await expect(page.getByText('Payment #801 · Bill #42')).toBeVisible();
});

test('payment history errors are visible and can be refreshed', async ({ page }) => {
  await setup(page, 'Resident');
  let broken = true;
  await page.route('**/api/payment-transactions?*', route => broken
    ? route.fulfill({ status: 403, json: { detail: 'History access denied' } })
    : route.fulfill({ json: { items: [], totalCount: 0, skip: 0, take: 50 } }));
  await page.goto('/payment-history');
  await expect(page.getByRole('alert').filter({ hasText: 'History access denied' }).first()).toBeVisible();
  broken = false;
  await page.getByRole('button', { name: 'Refresh payments' }).click();
  await expect(page.getByText('No payments match these filters.')).toBeVisible();
});


test('billing pages separate tasks and protect the staff review route', async ({ page }) => {
  await setup(page, 'Resident');
  let reviewRequests = 0;
  await page.route('**/api/payment-transactions/admin/pending-verifications', route => { reviewRequests++; return route.fulfill({ json: [] }); });
  await page.goto('/my-bills');
  await expect(page.getByText('Total outstanding')).toBeVisible();
  await expect(page.getByLabel('Filter by bill ID')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Payments to verify' })).toHaveCount(0);
  const nav = page.getByRole('navigation', { name: 'Billing pages' });
  await expect(nav.getByRole('link', { name: 'Payment review' })).toHaveCount(0);
  await nav.getByRole('link', { name: 'Payment history' }).click();
  await expect(page).toHaveURL(/payment-history$/);
  await expect(page.getByLabel('Filter by bill ID')).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/my-bills$/);
  await page.goto('/payment-review');
  await expect(page).toHaveURL(/my-bills$/);
  expect(reviewRequests).toBe(0);
});

test('staff can approve a payment from the separate review page', async ({ page }) => {
  await setup(page);
  let reviewed = false;
  await page.route('**/api/payment-transactions/admin/pending-verifications', route => route.fulfill({ json: reviewed ? [] : [{ transactionId: 9, billId: 42, amountPaid: 525, flatNo: 'A-101', status: 'Submitted' }] }));
  await page.route('**/api/payment-transactions/9/verify', route => {
    expect(route.request().postDataJSON()).toEqual({ isVerified: true, failureReason: null });
    reviewed = true;
    return route.fulfill({ json: {} });
  });
  await page.goto('/my-bills');
  await page.getByRole('navigation', { name: 'Billing pages' }).getByRole('link', { name: 'Payment review' }).click();
  await page.getByRole('button', { name: 'Approve', exact: true }).click();
  await expect(page.getByText('No payments are waiting for review.')).toBeVisible();
  expect(reviewed).toBe(true);
});

for (const path of ['/payment-history', '/payment-review']) {
  test('separated billing page fits a small phone: ' + path, async ({ page }) => {
    await setup(page);
    await page.setViewportSize({ width: 320, height: 740 });
    await page.goto(path);
    await expect(page.getByRole('navigation', { name: 'Billing pages' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
}


test('staff cash payment remains available on Bills after separating review', async ({ page }) => {
  await setup(page);
  const calls = [];
  await page.route('**/api/payment-transactions/create', route => {
    expect(route.request().postDataJSON().paymentMode).toBe('CASH');
    calls.push('create');
    return route.fulfill({ json: { transactionId: 99 } });
  });
  await page.route('**/api/payment-transactions/admin/99/manual-verify', route => {
    calls.push('verify');
    return route.fulfill({ json: {} });
  });
  await page.goto('/my-bills');
  page.on('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Cash', exact: true }).click();
  await expect(page.getByText('Cash payment verified.')).toBeVisible();
  expect(calls).toEqual(['create', 'verify']);
});
