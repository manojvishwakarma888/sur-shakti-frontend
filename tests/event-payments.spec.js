import { Buffer } from 'node:buffer';
import { test, expect } from '@playwright/test';

for (const role of ['Admin', 'Resident']) {
  for (const activity of ['none', 'Submitted', 'Verified', 'Refunded']) {
    test(`${role} cancelled booking with ${activity} payment keeps only relevant actions`, async ({ page }) => {
      const payload = Buffer.from(JSON.stringify({ sub: 'resident-1', role, FullName: 'Test User', FlatNo: '52' })).toString('base64url');
      await page.context().addCookies([{ name: 'token', value: `e30.${payload}.test`, url: 'http://127.0.0.1:5174' }]);
      const paid = ['Verified', 'Refunded'].includes(activity);
      let instructionsRequested = 0;
      await page.route('**/api/**', route => {
        const path = new URL(route.request().url()).pathname.toLowerCase();
        if (path.endsWith('/event-bookings')) return route.fulfill({ json: [{ id: 12, title: 'Cancelled celebration', status: 'Cancelled', location: 'CommonPlot', plotNumber: 2, chairQuantity: 50, bookingCharge: 2500, deposit: 2000, startsAt: '2027-10-20T10:00:00Z', endsAt: '2027-10-21T10:00:00Z', paymentDeadline: '2027-10-19T10:00:00Z' }] });
        if (path.endsWith('/12/payment-summary')) return route.fulfill({ json: { bookingCharge: 2500, deposit: 2000, verifiedPayments: paid ? 4500 : 0, balanceDue: paid ? 0 : 4500, refundDue: activity === 'Refunded' ? 4500 : 0, refunded: activity === 'Refunded' ? 4500 : 0, refundRemaining: 0, paymentStatus: paid ? 'Paid' : activity === 'Submitted' ? 'Submitted' : 'Unpaid' } });
        if (path.endsWith('/12/payments')) return route.fulfill({ json: activity === 'none' ? [] : [{ id: 1, status: paid ? 'Verified' : activity, amount: 4500, method: 'UPI', transactionReference: 'EVENT-REFERENCE', paidAt: '2026-09-24T10:00:00Z' }] });
        if (path.endsWith('/12/settlement')) return activity === 'Refunded'
          ? route.fulfill({ json: { chairsReturned: 50, deductions: 0, refundDue: 4500, additionalDue: 0, notes: 'Cancelled and refunded' } })
          : route.fulfill({ status: 404, json: { message: 'No settlement' } });
        if (path.endsWith('/12/refunds')) return route.fulfill({ json: activity === 'Refunded' ? [{ id: 1, amount: 4500, method: 'UPI', paidAt: '2026-09-24T11:00:00Z' }] : [] });
        if (path.endsWith('/12/payment-instructions')) { instructionsRequested++; return route.fulfill({ status: 409, json: { message: 'Not accepting payment' } }); }
        return route.fulfill({ json: path.endsWith('/current-user') ? {} : [] });
      });
      await page.goto('/event-management/history');
      await page.getByRole('button', { name: 'Track progress' }).click();
      if (activity === 'none') {
        await expect(page.getByText('No payment required. This booking was cancelled without payment.')).toBeVisible();
        await expect(page.locator('.event-payment-workspace')).toHaveCount(0);
      } else {
        await expect(page.getByRole('heading', { name: 'Payment activity' })).toBeVisible();
        await expect(page.getByText(/EVENT-REFERENCE/)).toBeVisible();
      }
      await expect(page.getByRole('heading', { name: '₹4,500 due' })).toHaveCount(0);
      await expect(page.getByText(/Pay before/)).toHaveCount(0);
      await expect(page.getByRole('link', { name: 'Open UPI app' })).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'Record cash & issue receipt' })).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'Save final settlement' })).toHaveCount(role === 'Admin' && activity === 'Verified' ? 1 : 0);
      if (activity !== 'Refunded') expect(instructionsRequested).toBe(0);
      if (activity === 'Refunded') await expect(page.getByText('Refund history', { exact: true })).toBeVisible();
      if (paid) await expect(page.getByRole('button', { name: 'Receipt', exact: true })).toBeVisible();
      if (activity === 'Submitted' && role === 'Admin') await expect(page.getByRole('button', { name: 'Verify', exact: true })).toBeVisible();
    });
  }
}

for (const { resource, outdated } of [{ resource: 'plot' }, { resource: 'chairs' }, { resource: 'plot', outdated: true }]) {
  test(`committee ${resource} booking ${outdated ? 'blocks outdated server pricing' : 'is free and still submitted for approval'}`, async ({ page }) => {
    const payload = Buffer.from(JSON.stringify({ sub: 'resident-1', role: 'Resident', FullName: 'Test Resident', FlatNo: '52' })).toString('base64url');
    await page.context().addCookies([{ name: 'token', value: `e30.${payload}.test`, url: 'http://127.0.0.1:5174' }]);
    let submitted;
    let returnOldPrice = false;
    await page.route('**/api/**', route => {
      const path = new URL(route.request().url()).pathname.toLowerCase();
      if (path.endsWith('/availability')) return route.fulfill({ json: { availablePlots: [1, 2, 3], availableChairs: 50 } });
      if (path.endsWith('/quote')) {
        if (returnOldPrice) return route.fulfill({ json: { bookingCharge: 2500, deposit: 2000, totalDue: 4500 } });
        const dto = route.request().postDataJSON();
        const bookingCharge = dto.purpose === 'SocietyEvent' ? 0 : dto.location === 'CommonPlot' ? 2500 : dto.chairQuantity * 3;
        const deposit = dto.purpose !== 'SocietyEvent' && dto.location === 'CommonPlot' ? 2000 : 0;
        return route.fulfill({ json: { bookingCharge, deposit, totalDue: bookingCharge + deposit } });
      }
      if (path.endsWith('/event-bookings') && route.request().method() === 'POST') {
        submitted = route.request().postDataJSON();
        return route.fulfill({ status: 201, json: { ...submitted, id: 22, bookingCharge: 0, deposit: 0, status: 'Pending' } });
      }
      return route.fulfill({ json: path.endsWith('/current-user') ? {} : [] });
    });
    await page.goto('/event-management');
    if (resource === 'plot') {
      await page.getByLabel('Event purpose', { exact: true }).selectOption('SocietyEvent');
      await expect(page.locator('.plot-options small')).toHaveText(['Free', 'Free', 'Free']);
      await page.getByLabel('Event purpose', { exact: true }).selectOption('PrivateFunction');
      await expect(page.locator('.plot-options small')).toHaveText(['From ₹1,000', 'From ₹1,500', 'From ₹1,000']);
      await page.getByLabel('Event purpose', { exact: true }).selectOption('SocietyEvent');
    } else {
      await page.getByRole('button', { name: /Society chairs Chairs without/ }).click();
      await page.getByLabel('Purpose', { exact: true }).selectOption('society');
      await page.getByLabel('Number of chairs').fill('20');
    }
    await page.getByRole('button', { name: 'Continue to event details' }).click();
    if (resource === 'plot') await expect(page.locator('.duration-options small')).toHaveText(['Free', 'Free']);
    await page.getByLabel('Event name', { exact: true }).fill('Committee gathering');
    const future = new Date(); future.setDate(future.getDate() + 10);
    await page.getByLabel('Event date', { exact: true }).fill(future.toISOString().slice(0, 10));
    await expect(page.getByRole('status').filter({ hasText: 'Available ·' })).toBeVisible();
    await page.getByRole('button', { name: 'Review booking' }).click();
    await expect(page.locator('.booking-summary .summary-total strong')).toHaveText('Free');
    await expect(page.locator('.booking-summary')).not.toContainText('Refundable deposit');
    await page.getByRole('checkbox', { name: /I have read and accept/ }).check();
    returnOldPrice = Boolean(outdated);
    await page.getByRole('button', { name: 'Submit request' }).click();
    if (outdated) {
      await expect(page.getByText('Society events must be free. The server pricing needs updating; your booking has not been submitted.')).toBeVisible();
      expect(submitted).toBeUndefined();
      return;
    }
    await expect(page.getByRole('heading', { name: 'Booking #22 is pending review' })).toBeVisible();
    expect(submitted.purpose).toBe('SocietyEvent');
    expect(submitted.location).toBe(resource === 'plot' ? 'CommonPlot' : 'House');
  });
}

test('resident can review event charges and submit a UPI reference', async ({ page }) => {
  const payload = Buffer.from(JSON.stringify({ sub: 'resident-1', role: 'Resident', FullName: 'Test Resident', FlatNo: 'A-101' })).toString('base64url');
  await page.context().addCookies([{ name: 'token', value: `e30.${payload}.test`, url: 'http://127.0.0.1:5174' }]);
  await page.setViewportSize({ width: 390, height: 844 });
  let submitted;
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url());
    const path = url.pathname.toLowerCase();
    if (path.endsWith('/event-bookings')) return route.fulfill({ json: [{ id: 12, title: 'Birthday celebration', status: 'AwaitingPayment', location: 'CommonPlot', locationDetails: 'Common Plot 2', plotNumber: 2, chairQuantity: 20, bookingCharge: 2500, deposit: 2000, startsAt: '2026-10-20T10:00:00Z', endsAt: '2026-10-21T10:00:00Z', paymentDeadline: '2026-10-19T10:00:00Z' }] });
    if (path.endsWith('/12/payment-summary')) return route.fulfill({ json: { bookingCharge: 2500, deposit: 2000, verifiedPayments: 0, balanceDue: 4500, refundDue: 0, refunded: 0, refundRemaining: 0, paymentStatus: 'Unpaid', refundStatus: 'NotAssessed' } });
    if (path.endsWith('/12/payment-instructions')) return route.fulfill({ json: { upiId: 'society@upi', payeeName: 'Sur Shakti Society', upiUri: 'upi://pay?pa=society%40upi&pn=Sur%20Shakti%20Society&am=4500.00&cu=INR&tn=Event-12', amount: 4500, currency: 'INR', methods: ['UPI', 'Cash'] } });
    if (path.endsWith('/12/payments/upi')) { submitted = route.request().postDataJSON(); return route.fulfill({ json: { id: 5, status: 'Submitted', amount: 4500, method: 'UPI' } }); }
    if (path.endsWith('/12/payments') || path.endsWith('/12/refunds')) return route.fulfill({ json: [] });
    if (path.endsWith('/12/settlement')) return route.fulfill({ status: 404, json: { message: 'Settlement not recorded.' } });
    if (path.endsWith('/current-user')) return route.fulfill({ json: {} });
    return route.fulfill({ json: [] });
  });

  await page.goto('/event-management/history');
  await page.getByRole('button', { name: 'Track progress' }).click();
  await expect(page.getByRole('heading', { name: '₹4,500 due' })).toBeVisible();
  await expect(page.getByText('Refundable deposit')).toBeVisible();
  await expect(page.getByText('Scan with any UPI app')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open UPI app' })).toHaveAttribute('href', /pa=7276450016%40ybl/);
  const timeline = page.locator('.booking-lifecycle ol');
  expect(await timeline.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
  expect(await timeline.locator('li').first().boundingBox().then(first => timeline.locator('li').nth(1).boundingBox().then(second => second.y > first.y))).toBe(true);
  await page.getByLabel('UPI transaction reference').fill('UPI-EVENT-4500');
  await page.getByRole('button', { name: 'Submit for verification' }).click();
  await expect.poll(() => submitted?.transactionReference).toBe('UPI-EVENT-4500');
  expect(submitted.amount).toBe(4500);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
