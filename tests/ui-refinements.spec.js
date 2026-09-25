import { Buffer } from 'node:buffer';
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const longNotice = 'Community meeting information. '.repeat(20) + 'Final detail remains available.';
async function setup(page) {
  const token = 'e30.' + Buffer.from(JSON.stringify({ sub: 'resident-1', role: 'Resident', FullName: 'Resident', FlatNo: '52' })).toString('base64url') + '.test';
  await page.context().addCookies([{ name: 'token', value: token, url: 'http://127.0.0.1:5174' }]);
  await page.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname.toLowerCase();
    if (path.endsWith('/notice')) return route.fulfill({ json: [{ noticeId: 1, title: 'Community meeting', content: longNotice, category: 'Meeting', expiryDate: '2027-12-30' }] });
    if (path.endsWith('/complaint')) return route.fulfill({ json: [
      { ticketId: 1, title: 'Corridor light', description: 'Light needs repair.', category: 'Electrical', status: 'Pending', createdAt: '2026-09-20' },
      { ticketId: 2, title: 'Water supply', description: 'Supply restored.', category: 'Plumbing', status: 'Resolved', createdAt: '2026-09-19' },
    ] });
    if (path.endsWith('/bill')) return route.fulfill({ json: [{ billId: 17, userId: 'resident-1', amount: 1500, month: 'September 2026', billType: 'Maintenance', isPaid: false }] });
    if (path.endsWith('/payment-transactions')) return route.fulfill({ json: { items: [], totalCount: 0, skip: 0, take: 50 } });
    return route.fulfill({ json: path.endsWith('/current-user') ? {} : [] });
  });
}

for (const width of [768, 1440]) {
  for (const dark of [false, true]) {
    test(`sidebar layout and styling stay stable on event routes at ${width}px (${dark ? 'dark' : 'light'})`, async ({ page }) => {
      await setup(page);
      await page.setViewportSize({ width, height: 1000 });
      await page.goto('/notices');
      if (dark) await page.getByRole('button', { name: 'Switch to dark mode' }).click();
      await page.mouse.move(0, 0);
      await page.locator('#app-sidebar').evaluate(async element => {
        await Promise.all(element.getAnimations({ subtree: true }).map(animation => animation.finished));
      });
      const snapshot = () => page.locator('#app-sidebar').evaluate(sidebar => {
        const style = element => {
          const computed = getComputedStyle(element);
          return { background: computed.backgroundColor, color: computed.color, radius: computed.borderRadius, border: computed.borderRightColor };
        };
        return {
          sidebar: style(sidebar),
          active: style(sidebar.querySelector('a.active')),
          positions: [...sidebar.querySelectorAll('.nav-link')].map(element => {
            const { x, y, width, height } = element.getBoundingClientRect();
            return { x, y, width, height, radius: getComputedStyle(element).borderRadius };
          }),
        };
      });
      const before = await snapshot();
      for (const path of ['/event-management', '/event-management/history', '/notices']) {
        if (path === '/event-management/history') await page.goto(path);
        else await page.locator(`#app-sidebar a[href="${path}"]`).click();
        await expect(page).toHaveURL(new RegExp(`${path}$`));
        await page.mouse.move(0, 0);
        await expect.poll(snapshot).toEqual(before);
      }
    });
  }
}

for (const width of [320, 768, 1440]) {
  test(`navigation fonts stay consistent on event routes at ${width}px`, async ({ page }) => {
    await setup(page);
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/notices');
    const fonts = () => page.locator('#app-sidebar .nav-link, .mobile-nav-label').evaluateAll(elements =>
      elements.map(element => getComputedStyle(element).fontSize));
    const before = await fonts();
    if (width < 768) await page.getByRole('button', { name: 'Open navigation' }).click();
    await page.locator('#app-sidebar a[href="/event-management"]').click();
    await expect(page).toHaveURL(/\/event-management$/);
    await expect.poll(fonts).toEqual(before);
    await page.goto('/event-management/history');
    await expect.poll(fonts).toEqual(before);
  });

  test(`daily tasks preserve information and fit at ${width}px`, async ({ page }, testInfo) => {
    await setup(page);
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/complaints');
    const filters = page.getByRole('group', { name: 'Filter helpdesk tickets' });
    await expect(page.getByRole('heading', { name: /Corridor light/ })).toBeVisible();
    await filters.getByRole('button', { name: /Resolved/ }).click();
    await expect(page.getByRole('heading', { name: /Water supply/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Corridor light/ })).toHaveCount(0);
    await filters.getByRole('button', { name: /All/ }).click();
    await expect(page.getByRole('heading', { name: /Corridor light/ })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.goto('/notices');
    await expect(page.getByText(/Final detail remains available/)).toHaveCount(0);
    await page.getByRole('button', { name: 'Read full notice' }).click();
    await expect(page.getByText(longNotice, { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Show less' }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.goto('/my-bills');
    await expect(page.getByText('Total amount due')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Pay Now' }).filter({ visible: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath('bills.png'), fullPage: true });
    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: 'Welcome home, Resident!' })).toBeVisible();
    await expect(page.locator('.community-page-hero')).toHaveCount(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const contrast = await new AxeBuilder({ page }).include('.resident-widget-row').withRules(['color-contrast']).analyze();
    expect(contrast.violations).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath('dashboard.png'), fullPage: true });
  });
}
