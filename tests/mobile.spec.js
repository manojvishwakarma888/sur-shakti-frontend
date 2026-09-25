import AxeBuilder from '@axe-core/playwright';
import { Buffer } from 'node:buffer';

import { test, expect } from '@playwright/test';

const bill = { billId: 17, userId: 'resident-1', amount: 1500, month: 'September 2026', billType: 'Maintenance', isPaid: false };
async function setup(page, { role = 'Resident', failedBills = false, records = [] } = {}) {
  const payload = Buffer.from(JSON.stringify({ sub: 'resident-1', role, FullName: 'Test Resident', FlatNo: 'A-101' })).toString('base64url');
  await page.context().addCookies([{ name: 'token', value: 'e30.' + payload + '.test', url: 'http://127.0.0.1:5174' }]);
  await page.addInitScript(records => {
    localStorage.setItem('surshakti_payment_audit_v1', JSON.stringify(records));
  }, records);
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname.toLowerCase();
    if (path.endsWith('/bill')) {
      await route.fulfill({ status: failedBills ? 400 : 200, json: failedBills ? { message: 'Unavailable' } : [bill] });
    } else if (path.endsWith('/notice')) await route.fulfill({ json: [{ noticeId: 1, title: 'Basket Ball Tournament', content: 'We are planning for one day basketball tournament.', category: 'Event', postedDate: '2026-01-05', expiryDate: '2026-01-12', isUrgent: false }] });
    else if (path.endsWith('/complaint')) await route.fulfill({ json: [{ ticketId: 1, title: 'Corridor light', description: 'The light near A-101 is not working.', category: 'Electrical', status: 'Pending', createdAt: '2026-09-18', raisedBy: 'Test Resident', flatNo: 'A-101' }] });
    else if (path.endsWith('/directory')) await route.fulfill({ json: [{ id: 1, fullName: 'Aarav Sharma', flatNo: 'A-102', phoneNumber: '9876543210' }, { id: 2, fullName: 'Meera Patel', flatNo: 'B-204', phoneNumber: '9876501234' }] });
    else if (path.endsWith('/expense')) await route.fulfill({ json: [{ id: 1, title: 'Lift servicing', amount: 4500, category: 'Repairs', date: '2026-09-15' }] });
    else if (path.endsWith('/profile')) await route.fulfill({ json: { fullName: 'Test Resident', flatNo: 'A-101', email: 'resident@example.com', role, phoneNumber: '9876543210', profilePictureUrl: '' } });
    else if (path.endsWith('/dashboard/stats')) await route.fulfill({ json: { totalIncome: 125000, totalExpense: 24000, cashInHand: 101000, totalPending: 15000, pendingComplaints: 2 } });
    else if (path.endsWith('/42/receipt')) await route.fulfill({ json: { receiptNumber: 'SSC-42', transactionId: 42, billId: 17, flatNo: 'A-101', month: 'September 2026', amountPaid: 1500, paymentMode: 'UPI', issuedAt: '2026-09-18' } });
    else if (path.endsWith('/current-user')) await route.fulfill({ json: {} });
    else if (path.endsWith('/create')) await route.fulfill({ json: { transactionId: 42 } });
    else if (path.endsWith('/submit')) await route.fulfill({ json: {} });
    else await route.fulfill({ json: [] });
  });
}

for (const route of ['/dashboard', '/notices', '/complaints', '/directory', '/expenses', '/profile']) {
  test('mobile screen is usable without overflow: ' + route, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await setup(page);
    await page.goto(route);
    await expect(page.locator('#main-content')).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(route.slice(1) + '.png'), fullPage: true });
  });
}
for (const width of [320, 390, 768, 1280]) {
  test('bills fit the viewport at ' + width + 'px', async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 844 });
    await setup(page);
    await page.goto('/my-bills');
    await expect(page.getByText('Total outstanding')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath('bills.png'), fullPage: true });
    if (width < 768) {
      await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();
      const button = page.getByRole('button', { name: 'Pay Now' }).filter({ visible: true });
      expect((await button.boundingBox()).height).toBeGreaterThanOrEqual(44);
    }
  });
}
test('mobile drawer traps focus, closes on Escape, and restores focus', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await setup(page);
  await page.goto('/my-bills');
  const trigger = page.getByRole('button', { name: 'Open navigation' });
  await trigger.click();
  const drawer = page.getByRole('dialog', { name: 'Community navigation' });
  await expect(drawer).toBeVisible();
  await expect(page.getByRole('button', { name: 'Close navigation' })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('button', { name: 'Sign Out' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
});
test('payment waits for response and duplicate references stay editable', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await setup(page, { records: [{ userId: 'resident-1', billId: '18', transactionId: 'EXISTING123', status: 'synced' }] });
  let release;
  const pending = new Promise(resolve => { release = resolve; });
  let submissions = 0;
  await page.route('**/api/payment-transactions/42/submit', async route => {
    submissions++;
    await pending;
    await route.fulfill({ json: {} });
  });
  await page.goto('/my-bills');
  await page.getByRole('button', { name: 'Pay Now' }).filter({ visible: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Pay your bill' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('link', { name: 'Open UPI app' })).toHaveAttribute('href', /cu=INR/);
  await page.getByRole('button', { name: "I've paid" }).click();
  await page.getByLabel('Transaction reference (UTR)').fill('EXISTING123');
  await page.getByRole('button', { name: 'Submit for review' }).click();
  await expect(dialog.getByRole('alert')).toContainText('already been submitted');
  await page.getByLabel('Transaction reference (UTR)').fill('NEWUTR12345');
  await page.getByRole('button', { name: 'Submit for review' }).click();
  await expect(page.getByRole('button', { name: 'Submitting…' })).toBeDisabled();
  await expect(dialog).toBeVisible();
  await expect(page.getByText('Payment Submitted!', { exact: true })).toHaveCount(0);
  await expect.poll(() => submissions).toBe(1);
  release();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByText('Payment submitted successfully!')).toBeVisible();
  expect(submissions).toBe(1);
});
test('bill load failure has retry and does not show an empty success state', async ({ page }) => {
  await setup(page, { failedBills: true });
  await page.goto('/my-bills');
  await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
  await expect(page.getByText('No bills yet')).toHaveCount(0);
  await expect(page.getByText('Total outstanding')).toHaveCount(0);
});
test('stored payments from another account are not replayed', async ({ page }) => {
  let created = 0;
  await setup(page, { records: [{ userId: 'other-user', billId: '17', transactionId: 'OTHER12345', amount: 1500, status: 'failed' }] });
  await page.route('**/api/payment-transactions/create', async route => { created++; await route.fulfill({ json: { transactionId: 42 } }); });
  await page.goto('/my-bills');
  await expect(page.getByText('Total outstanding')).toBeVisible();
  expect(created).toBe(0);
  await expect(page.getByRole('dialog', { name: 'Pay your bill' })).toHaveCount(0);
});
test('failed submission retains the created transaction for retry', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await setup(page);
  let created = 0;
  let fail = true;
  await page.route('**/api/payment-transactions/create', async route => { created++; await route.fulfill({ json: { transactionId: 42 } }); });
  await page.route('**/api/payment-transactions/42/submit', async route => {
    await route.fulfill({ status: fail ? 400 : 200, json: fail ? { message: 'Try later' } : {} });
  });
  await page.goto('/my-bills');
  await page.getByRole('button', { name: 'Pay Now' }).filter({ visible: true }).click();
  await page.getByRole('button', { name: "I've paid" }).click();
  await page.getByLabel('Transaction reference (UTR)').fill('RETRY12345');
  await page.getByRole('button', { name: 'Submit for review' }).click();
  await expect(page.getByRole('dialog', { name: 'Pay your bill' })).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'Pay your bill' }).getByRole('alert')).toContainText('Try later');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('surshakti_payment_audit_v1'))[0].paymentTransactionId)).toBe('42');
  fail = false;
  await page.getByRole('button', { name: 'Submit for review' }).click();
  await expect(page.getByRole('dialog', { name: 'Pay your bill' })).toHaveCount(0);
  expect(created).toBe(1);
});

test('admin controls and dark-mode payment sheet fit a small phone', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await setup(page, { role: 'Admin' });
  await page.goto('/my-bills');
  await expect(page.getByRole('button', { name: 'Generate Bill' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Cash', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Switch to dark mode' }).filter({ visible: true }).click();
  await page.screenshot({ path: testInfo.outputPath('admin-dark.png'), fullPage: true });
});

test('dashboard arrows and event labels remain visible', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await setup(page, { role: 'Admin' });
  await page.goto('/dashboard');
  const firstStat = page.locator('.admin-stat-card').first();
  await expect(firstStat.getByText('TOTAL COLLECTION')).toBeVisible();
  await expect(firstStat.locator('svg')).toBeVisible();
  const colors = await firstStat.locator('svg').evaluate(icon => ({
    foreground: getComputedStyle(icon).color,
    background: getComputedStyle(icon.parentElement).backgroundColor,
  }));
  expect(colors.foreground).not.toBe(colors.background);
  await page.screenshot({ path: testInfo.outputPath('admin-dashboard.png'), fullPage: true });

  await setup(page, { role: 'Resident' });
  await page.goto('/dashboard');
  await expect(page.getByText('Event', { exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('resident-dashboard.png'), fullPage: true });
});
test('receipt PDF downloads with on-demand export libraries', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await setup(page);
  await page.route('**/api/Bill', route => route.fulfill({ json: [{ ...bill, isPaid: true, paymentDate: '2026-09-18', paymentTransactionId: 42 }] }));
  await page.goto('/my-bills');
  await page.getByRole('button', { name: 'Receipt', exact: true }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PDF' }).click();
  expect((await download).suggestedFilename()).toMatch(/\.pdf$/);
});

for (const viewport of [{ width: 390, height: 700 }, { width: 1280, height: 720 }]) {
  test(`receipt preview keeps its header and actions visible at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await setup(page);
    await page.route('**/api/Bill', route => route.fulfill({ json: [{ ...bill, isPaid: true, paymentDate: '2026-09-18', paymentTransactionId: 42 }] }));
    await page.goto('/my-bills');
    const receiptTrigger = viewport.width < 768
      ? page.getByRole('button', { name: 'Receipt', exact: true }).filter({ visible: true })
      : page.getByTitle('Download Receipt');
    await receiptTrigger.click();
    const dialog = page.getByRole('dialog', { name: 'Receipt Preview' });
    const close = dialog.getByRole('button', { name: 'Close receipt' });
    const download = dialog.getByRole('button', { name: 'Download PDF' });
    await expect(dialog).toBeVisible();
    await expect(close).toBeVisible();
    await expect(download).toBeVisible();
    const bounds = await dialog.boundingBox();
    expect(bounds.y).toBeGreaterThanOrEqual(0);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(viewport.height + 1);
  });
}

test('resident overview shows every card without swiping and retains ticket counts', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await setup(page);
  await page.goto('/dashboard');
  const row = page.getByRole('region', { name: 'Resident widgets' });
  const helpdesk = page.locator('.helpdesk-summary-card');
  await expect(helpdesk).toContainText('Pending');
  await expect(helpdesk.locator('strong').first()).toHaveText('1');
  await expect(helpdesk.locator('strong').last()).toHaveText('0');
  expect(await row.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
  await expect(row.getByRole('link', { name: 'Pay Now' })).toBeVisible();
  await expect(row.getByRole('link', { name: 'Report', exact: true })).toBeVisible();
  await expect(row.getByRole('link', { name: 'View tickets' })).toBeVisible();
  await helpdesk.scrollIntoViewIfNeeded();
  await expect(helpdesk).toBeInViewport();
  await page.setViewportSize({ width: 1280, height: 844 });
  await expect(page.locator('.resident-widget-navigation')).toBeHidden();
  await expect(helpdesk).toBeInViewport();
});

for (const role of ['Admin', 'Resident']) {
  for (const width of [320, 390]) {
    test('mobile themed widgets ' + role + ' at ' + width, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: 844 });
      await setup(page, { role });
      await page.goto('/dashboard');
      await expect(page.getByRole('navigation', { name: 'Dashboard shortcuts' })).toBeVisible();
      const row = page.getByRole('region', { name: role + ' widgets' });
      await expect(row).toBeVisible();
      if (role === 'Admin') {
        await row.focus();
        await page.keyboard.press('End');
        await expect(page.getByRole('button', { name: 'Open Complaints', exact: true })).toHaveAttribute('aria-current', 'true');
      } else {
        expect(await row.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
        await expect(row.getByRole('link', { name: 'View tickets' })).toBeVisible();
      }
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.getByRole('button', { name: 'Switch to dark mode' }).click();
      await expect(page.locator('body')).toHaveClass(/dark-mode/);
      const darkContrast = await new AxeBuilder({ page }).include(role === 'Admin' ? '.widget-stack' : '.resident-overview').include('.mobile-shortcuts').withRules(['color-contrast']).analyze();
      expect(darkContrast.violations).toEqual([]);
      await page.screenshot({ path: testInfo.outputPath('mobile-dark.png'), fullPage: true });
      await page.getByRole('button', { name: 'Switch to light mode' }).click();
      const lightContrast = await new AxeBuilder({ page }).include(role === 'Admin' ? '.widget-stack' : '.resident-overview').include('.mobile-shortcuts').withRules(['color-contrast']).analyze();
      expect(lightContrast.violations).toEqual([]);
      await page.screenshot({ path: testInfo.outputPath('mobile-light.png'), fullPage: true });
      const shortcuts = page.getByRole('navigation', { name: 'Dashboard shortcuts' });
      for (const path of ['/dashboard', '/my-bills', '/notices', '/complaints']) {
        await expect(shortcuts.locator('a[href="' + path + '"]')).toHaveCount(0);
      }
      const request = page.waitForRequest(request => request.url().toLowerCase().endsWith('/bill'));
      await shortcuts.getByRole('button', { name: 'Refresh', exact: true }).click();
      await request;
      await expect(shortcuts.getByRole('button', { name: 'Refresh', exact: true })).toBeEnabled();
      if (role === 'Admin') {
        const download = page.waitForEvent('download');
        await shortcuts.getByRole('button', { name: 'Export dues' }).click();
        expect((await download).suggestedFilename()).toBe('SurShakti_Pending_Dues.csv');
        await shortcuts.getByRole('button', { name: 'Add residents' }).click();
        await expect(page.getByText('Bulk Import Residents', { exact: true })).toBeVisible();
        await page.getByRole('button', { name: 'Cancel', exact: true }).click();
        await shortcuts.getByRole('button', { name: 'Create bill' }).click();
        await expect(page.getByRole('heading', { name: 'Generate New Bills' })).toBeVisible();
      } else {
        await shortcuts.getByRole('link', { name: 'Contacts' }).click();
        await expect(page).toHaveURL(/directory/);
      }    });
  }
}




test('mobile account menu and fixed drawer arrow work while scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 600 });
  await setup(page, { role: 'Admin' });
  await page.goto('/dashboard');
  const arrow = page.getByRole('button', { name: 'Open navigation' });
  const before = await arrow.boundingBox();
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect.poll(async () => (await arrow.boundingBox()).y).toBe(before.y);
  await arrow.click();
  const drawer = page.getByRole('dialog', { name: 'Community navigation' });
  await expect(drawer).toBeVisible();
  await expect(drawer.getByRole('link', { name: 'Directory' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(arrow).toBeFocused();
  await page.evaluate(() => window.scrollTo(0, 0));
  const account = page.getByRole('button', { name: 'Your account' });
  await account.click();
  const panel = page.getByRole('region', { name: 'Your account' });
  await expect(panel).toContainText('Test Resident');
  await page.keyboard.press('Escape');
  await expect(account).toBeFocused();
  await expect(panel).toHaveCount(0);
  await account.click();
  await page.mouse.click(375, 110);
  await expect(panel).toHaveCount(0);
  await account.click();
  await panel.getByRole('link', { name: 'My profile' }).click();
  await expect(page).toHaveURL(/profile/);
  await expect(panel).toHaveCount(0);
  await account.click();
  await panel.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/login/);
  expect((await page.context().cookies()).some(cookie => cookie.name === 'token')).toBe(false);
});


test('desktop sidebar toggle resizes content and remembers state; logos lead home', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await setup(page);
  await page.goto('/directory');
  await page.locator('#app-sidebar').getByRole('link', { name: 'Go to home' }).click();
  await expect(page).toHaveURL(/dashboard/);
  const main = page.locator('#main-content');
  const expandedWidth = (await main.boundingBox()).width;
  await page.getByRole('button', { name: 'Collapse sidebar' }).click();
  await expect(page.locator('#app-sidebar')).toBeHidden();
  expect((await main.boundingBox()).width).toBeGreaterThan(expandedWidth);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Expand sidebar' })).toHaveAttribute('aria-expanded', 'false');
  await page.goto('/directory');
  await page.locator('.app-header').getByRole('link', { name: 'Go to home' }).click();
  await expect(page).toHaveURL(/dashboard/);
  await page.getByRole('button', { name: 'Expand sidebar' }).click();
  await expect(page.locator('#app-sidebar')).toBeVisible();
  await page.getByRole('button', { name: 'Collapse sidebar' }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await expect(page.getByRole('dialog', { name: 'Community navigation' })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.goto('/directory');
  await page.locator('.app-header').getByRole('link', { name: 'Go to home' }).click();
  await expect(page).toHaveURL(/dashboard/);
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});


