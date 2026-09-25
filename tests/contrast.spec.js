import { Buffer } from 'node:buffer';
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const bill = { billId: 17, userId: 'resident-1', residentName: 'Test Resident', flatNo: 'A-101', amount: 1500, month: 'September 2026', billType: 'Maintenance', isPaid: false };

async function setup(page, darkMode) {
  const payload = Buffer.from(JSON.stringify({ sub: 'resident-1', role: 'Resident', FullName: 'Test Resident', FlatNo: 'A-101' })).toString('base64url');
  await page.context().addCookies([{ name: 'token', value: 'e30.' + payload + '.test', url: 'http://127.0.0.1:5174' }]);
  await page.addInitScript(dark => localStorage.setItem('theme', dark ? 'dark' : 'light'), darkMode);
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname.toLowerCase();
    if (path.endsWith('/bill')) await route.fulfill({ json: [bill] });
    else if (path.endsWith('/notice')) await route.fulfill({ json: [{ noticeId: 1, title: 'Water supply maintenance', content: 'Water supply will pause from 10 AM to 12 PM.', category: 'Maintenance', postedDate: '2026-09-18', expiryDate: '2026-09-22', isUrgent: true }] });
    else if (path.endsWith('/complaint')) await route.fulfill({ json: [{ ticketId: 1, title: 'Corridor light', description: 'The light near A-101 is not working.', category: 'Electrical', status: 'Pending', createdAt: '2026-09-18', raisedBy: 'Test Resident', flatNo: 'A-101' }] });
    else if (path.endsWith('/directory')) await route.fulfill({ json: [{ id: 1, fullName: 'Aarav Sharma', flatNo: 'A-102', phoneNumber: '9876543210' }] });
    else if (path.endsWith('/expense')) await route.fulfill({ json: [{ id: 1, title: 'Lift servicing', amount: 4500, category: 'Repairs', date: '2026-09-15' }] });
    else if (path.endsWith('/profile')) await route.fulfill({ json: { fullName: 'Test Resident', flatNo: 'A-101', email: 'resident@example.com', role: 'Resident', phoneNumber: '9876543210', profilePictureUrl: '' } });
    else if (path.endsWith('/dashboard/stats')) await route.fulfill({ json: { totalIncome: 125000, totalExpense: 24000, cashInHand: 101000, totalPending: 15000, pendingComplaints: 2 } });
    else if (path.endsWith('/current-user')) await route.fulfill({ json: {} });
    else await route.fulfill({ json: [] });
  });
}

for (const darkMode of [false, true]) {
  for (const route of ['/dashboard', '/my-bills', '/notices', '/complaints', '/directory', '/expenses', '/profile']) {
    test(`${darkMode ? 'dark' : 'light'} contrast: ${route}`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await setup(page, darkMode);
      await page.goto(route);
      await expect(page.locator('#main-content')).toBeVisible();
      const results = await new AxeBuilder({ page }).withRules(['color-contrast']).analyze();
      const details = results.violations.flatMap(violation => violation.nodes.map(node => ({
        target: node.target.join(' '),
        summary: node.failureSummary,
      })));
      expect(details, JSON.stringify(details, null, 2)).toEqual([]);
    });
  }
}

test('desktop resident quick actions have readable light-theme controls', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await setup(page, false);
  await page.goto('/dashboard');
  const card = page.locator('.quick-actions-card');
  await expect(card.getByText('Quick Actions')).toBeVisible();
  const results = await new AxeBuilder({ page }).include('.quick-actions-card').withRules(['color-contrast']).analyze();
  expect(results.violations).toEqual([]);
});
