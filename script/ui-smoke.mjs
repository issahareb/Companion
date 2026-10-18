import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const base = process.env.GG_PREVIEW_URL || 'http://127.0.0.1:4173';
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const errors = [];
const results = [];

try {
  for (const viewport of [
    { width: 390, height: 844, name: 'phone' },
    { width: 768, height: 1024, name: 'tablet' },
    { width: 1440, height: 900, name: 'desktop' },
  ]) {
    const context = await browser.newContext({
      viewport,
      reducedMotion: 'reduce',
      javaScriptEnabled: true,
    });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(viewport.name + ': ' + error.message));
    await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.getByRole('heading', { name: /GuardianGrid.*Destiny 2 companion/i }).waitFor({ timeout: 20_000 });
    const animatedGhost = page.locator('img[data-testid="img-ghost-logo"]');
    await animatedGhost.waitFor();
    assert.ok((await animatedGhost.getAttribute('src'))?.endsWith('.gif'), 'Original Ghost fallback is missing');
    assert.equal(await page.locator('picture source[type="image/webp"]').getAttribute('srcset'), '/guardian-ghost-animated.webp');
    const asset = await page.request.get(base + '/guardian-ghost-animated.webp');
    assert.equal(asset.status(), 200, 'animated Ghost asset unavailable');
    const size = (await asset.body()).length;
    assert.ok(size > 40_000 && size < 5_000_000, 'unexpected compressed Ghost size');

    const login = page.getByTestId('button-login');
    await login.waitFor({ timeout: 20_000 });
    assert.ok(await login.isVisible());
    const language = page.getByTestId('button-language-selector');
    await language.click();
    assert.ok(await page.getByTestId('button-lang-en').isVisible());
    await page.getByTestId('button-lang-en').click();
    assert.ok(await login.isVisible());

    const overflow = await page.evaluate(() =>
      document.documentElement.scrollWidth > document.documentElement.clientWidth + 3
    );
    assert.ok(!overflow, viewport.name + ': horizontal overflow detected');
    results.push({ viewport: viewport.name, route: '/', ghostBytes: size, status: 'pass' });

    await page.goto(base + '/demo', { waitUntil: 'domcontentloaded' });
    await page.getByText(/DEMO MODE.*Dummy Data/i).first().waitFor({ timeout: 20_000 });
    const tooWide = await page.evaluate(() =>
      document.documentElement.scrollWidth > document.documentElement.clientWidth + 3
    );
    assert.ok(!tooWide, viewport.name + ': demo horizontal overflow');
    results.push({ viewport: viewport.name, route: '/demo', status: 'pass' });
    await context.close();
  }
  assert.deepEqual(errors, [], 'Browser runtime errors');
  console.log('GuardianGrid browser smoke tests passed:', JSON.stringify(results));
} finally {
  await browser.close();
}
