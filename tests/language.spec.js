import { Buffer } from 'node:buffer';
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function choose(page, label) {
  await page.locator('.language-trigger').click();
  await page.getByRole('menuitemradio', { name: label, exact: true }).click();
  await expect(page.locator('.language-trigger')).toBeFocused();
  await expect(page.getByRole('menu')).toHaveCount(0);
}
async function mock(page, role = 'Resident') {
  const payload = Buffer.from(JSON.stringify({ sub: 'resident-1', role, FullName: 'Manoj', FlatNo: '52' })).toString('base64url');
  await page.context().addCookies([{ name: 'token', value: `e30.${payload}.test`, url: 'http://127.0.0.1:5174' }]);
  let submitted;
  await page.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname.toLowerCase();
    if (path.endsWith('/availability')) return route.fulfill({ json: { availablePlots: [1, 2, 3], availableChairs: 50 } });
    if (path.endsWith('/quote')) return route.fulfill({ json: { bookingCharge: 0, deposit: 0, totalDue: 0 } });
    if (path.endsWith('/event-bookings') && route.request().method() === 'POST') {
      submitted = route.request().postDataJSON();
      return route.fulfill({ status: 201, json: { ...submitted, id: 22, status: 'Pending' } });
    }
    if (path.endsWith('/notice')) return route.fulfill({ json: [{ noticeId: 1, title: 'Original resident notice', content: 'Keep this resident-written content unchanged.', category: 'General', expiryDate: '2030-12-30' }] });
    return route.fulfill({ json: path.endsWith('/current-user') ? {} : [] });
  });
  return () => submitted;
}

for (const width of [320, 768, 1440]) {
  test(`language changes preserve booking state and API values at ${width}px`, async ({ page }) => {
    const submitted = await mock(page);
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/event-management');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await page.getByLabel('Event purpose', { exact: true }).selectOption('SocietyEvent');
    await choose(page, 'हिन्दी');
    await expect(page.getByRole('heading', { name: 'अपने अगले कार्यक्रम की योजना बनाएँ' })).toBeVisible();
    await expect(page.locator('#plot-purpose')).toHaveValue('SocietyEvent');
    await expect(page.locator('#plot-purpose option:checked')).toHaveText('सामूहिक सोसाइटी कार्यक्रम');
    await page.getByRole('button', { name: 'कार्यक्रम विवरण पर जाएँ' }).click();
    await page.locator('#event-name').fill('Diwali celebration');
    const future = new Date(); future.setDate(future.getDate() + 10);
    await page.locator('#event-date').fill(future.toISOString().slice(0, 10));
    await page.locator('#requested-chairs').fill('20');
    await choose(page, 'ગુજરાતી');
    await expect(page.locator('#event-name')).toHaveValue('Diwali celebration');
    await expect(page.locator('#requested-chairs')).toHaveValue('20');
    await expect(page.locator('.availability-strip')).toContainText('ઉપલબ્ધ');
    await page.getByRole('button', { name: 'બુકિંગની સમીક્ષા' }).click();
    await expect(page.getByRole('heading', { name: 'તમારી બુકિંગની સમીક્ષા કરો' })).toBeVisible();
    await expect(page.locator('.summary-total strong')).toHaveText('મફત');
    await page.locator('.event-rules-check input').check();
    await choose(page, 'English');
    await expect(page.locator('.event-rules-check input')).toBeChecked();
    await page.getByRole('button', { name: 'Submit request' }).click();
    await expect(page.getByRole('heading', { name: 'Booking #22 is pending review' })).toBeVisible();
    expect(submitted().purpose).toBe('SocietyEvent');
    expect(submitted().title).toBe('Diwali celebration');
    expect(submitted().chairQuantity).toBe(20);
    expect(submitted().location).toBe('CommonPlot');
    expect(errors).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

test('saved language persists across navigation/reload; user content stays original', async ({ page }) => {
  await mock(page, 'Admin');
  await page.goto('/notices');
  await choose(page, 'ગુજરાતી');
  await expect(page.getByRole('heading', { name: 'સૂચના બોર્ડ', exact: true })).toBeVisible();
  await expect(page.getByText('Original resident notice', { exact: true })).toBeVisible();
  await expect(page.getByText('Keep this resident-written content unchanged.', { exact: true })).toBeVisible();
  await page.locator('#app-sidebar a[href="/event-management"]').click();
  await expect(page.getByRole('heading', { name: 'તમારા આગામી કાર્યક્રમનું આયોજન કરો' })).toBeVisible();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'gu');
  await expect(page.getByRole('heading', { name: 'તમારા આગામી કાર્યક્રમનું આયોજન કરો' })).toBeVisible();
});

test('public selector supports keyboard, dismissal and reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/login');
  const trigger = page.locator('.language-trigger');
  await trigger.focus(); await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('menuitemradio', { name: 'English', exact: true })).toBeFocused();
  await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter');
  await expect(page.locator('html')).toHaveAttribute('lang', 'hi');
  await expect(page.getByRole('heading', { name: 'फिर स्वागत है' })).toBeVisible();
  await trigger.click(); await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused(); await expect(page.getByRole('menu')).toHaveCount(0);
  await trigger.click(); await page.locator('.form-title').click();
  await expect(page.getByRole('menu')).toHaveCount(0);
  await choose(page, 'English');
  await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible();
});

for (const dark of [false, true]) {
  test(`mobile language menu fits and remains accessible (${dark ? 'dark' : 'light'})`, async ({ page }, testInfo) => {
    await mock(page);
    await page.setViewportSize({ width: 320, height: 844 });
    await page.goto('/dashboard');
    if (dark) await page.getByRole('button', { name: 'Switch to dark mode' }).click();
    await choose(page, 'ગુજરાતી');
    await expect(page.getByRole('heading', { name: 'ઘરે સ્વાગત છે, Manoj!' })).toBeVisible();
    await page.locator('.language-trigger').click();
    await expect(page.getByRole('menuitemradio', { name: 'ગુજરાતી' })).toHaveAttribute('aria-checked', 'true');
    const box = await page.locator('.language-panel').boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(0); expect(box.x + box.width).toBeLessThanOrEqual(320);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const accessibility = await new AxeBuilder({ page }).include('.language-switcher').analyze();
    expect(accessibility.violations).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath('language-menu.png') });
  });
}

test('invalid stored language falls back to English', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('app-language', 'unsupported'));
  await page.goto('/login');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible();
});

test('switching works when preference storage is blocked', async ({ page }) => {
  // Theme persistence is existing functionality; block only the language preference.
  await page.addInitScript(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === 'app-language') throw new DOMException('Storage blocked', 'SecurityError');
      return original.call(this, key, value);
    };
  });
  await page.goto('/login');
  await choose(page, 'हिन्दी');
  await expect(page.getByRole('heading', { name: 'फिर स्वागत है' })).toBeVisible();
  await choose(page, 'English');
  await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible();
});
