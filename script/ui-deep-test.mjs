import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const base = process.env.GG_PREVIEW_URL || 'http://127.0.0.1:4173';
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const results = [];
const failures = [];
mkdirSync('artifacts/guardian-e2e', { recursive: true });

const item = (id, name, slot, rarity = 'legendary') => ({
  id, itemHash: id === 'v1' ? 123456 : 456789, name,
  type: 'Hand Cannon', slot, screenshot: '', rarity, power: 2000, icon: '',
  location: 'vault', isInstanced: true, stats: [], perks: [], mods: [], sockets: [],
});
const character = {
  characterId: 'char-123', classType: 1, className: 'Hunter', raceName: 'Awoken',
  light: 2000, emblemPath: '', emblemBackgroundPath: '',
  dateLastPlayed: '2026-10-18T00:00:00Z',
  stats: [{ name: 'Mobility', value: 100, icon: '', description: 'Movement' }],
  equippedItems: [], inventory: [], quests: [], progressions: [],
};
const profile = {
  membershipId: '123', membershipType: 3,
  displayName: 'PlaywrightGuardian', iconPath: '',
};
const state = {
  characters: [character],
  vaultItems: [item('v1', 'Witherhoard', 'kinetic', 'exotic'), item('v2', 'Austringer', 'energy')],
  postmasterItems: [], currencies: [], collectibles: [], records: [],
  inGameLoadouts: {}, artifact: undefined,
};
function bindRuntimeErrors(page, label) {
  page.on('pageerror', error => failures.push(label + ': ' + error.message));
}
async function assertLayout(page, label) {
  const value = await page.evaluate(() => ({
    document: document.documentElement.scrollWidth,
    viewport: document.documentElement.clientWidth,
  }));
  assert.ok(value.document <= value.viewport + 4, label + ': horizontal overflow ' + JSON.stringify(value));
}
async function step(label, callback) {
  await callback();
  results.push(label);
  console.log('PASS ' + label);
}
async function visitDemoSection(page, section) {
  const menu = page.getByTestId('button-demo-menu');
  await menu.click();
  const nav = page.getByRole('dialog', { name: 'Demo navigation' });
  await nav.getByTestId('demo-nav-' + section).click();
  await nav.waitFor({ state: 'hidden' });
}

try {
  for (const { name, width, height } of [
    { name: 'phone', width: 390, height: 844 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'desktop', width: 1440, height: 900 },
  ]) {
    const context = await browser.newContext({
      viewport: { width, height }, reducedMotion: 'reduce',
    });
    await context.route('**/api/auth/me', r => r.fulfill({ status: 401, json: { message: 'Not authenticated' } }));
    await context.route('**/api/config/turnstile', r => r.fulfill({ json: { enabled: false, siteKey: '' } }));
    await context.route('**/api/loadouts/share/**', r => r.fulfill({ status: 404, json: { message: 'Loadout not found' } }));
    const page = await context.newPage();
    bindRuntimeErrors(page, 'public/' + name);

    await step(name + ' demo: class selection', async () => {
      await page.goto(base + '/demo', { waitUntil: 'domcontentloaded' });
      await page.getByText('DEMO MODE — Dummy Data').waitFor();
      await page.getByTestId('button-demo-char-char-2').click();
      assert.ok(await page.getByTestId('button-demo-char-char-2').isVisible());
      await page.getByTestId('button-demo-char-char-1').click();
      await page.screenshot({ path: `artifacts/guardian-e2e/${name}-demo-character.png` });
      await assertLayout(page, name + '/demo/characters');
    });

    await step(name + ' demo: vault filter and item detail', async () => {
      await visitDemoSection(page, 'vault');
      const search = page.getByTestId('demo-input-vault-search');
      await search.waitFor();
      assert.equal(await page.locator('[data-testid^="vault-item-"]').count(), 8);
      await search.fill('Witherhoard');
      assert.equal(await page.locator('[data-testid^="vault-item-"]').count(), 1);
      await page.getByTestId('vault-item-v1').click();
      await page.getByTestId('text-item-name').waitFor();
      assert.match(await page.getByTestId('text-item-name').innerText(), /Witherhoard/);
      await page.getByTestId('detail-action-loadout').click();
      await page.getByTestId('item-detail-modal').waitFor({ state: 'hidden' });
      await search.fill('');
      assert.equal(await page.locator('[data-testid^="vault-item-"]').count(), 8);
      await assertLayout(page, name + '/demo/vault');
      await page.screenshot({ path: `artifacts/guardian-e2e/${name}-demo-vault.png` });
    });

    await step(name + ' demo: all navigation sections', async () => {
      for (const [section, marker] of [
        ['collections', 'img'],
        ['triumphs', ''],
        ['season', ''],
        ['loadouts', ''],
        ['postmaster', ''],
        ['guardian', ''],
      ]) {
        await visitDemoSection(page, section);
        const header = page.locator('main header h2');
        await header.waitFor();
        assert.ok((await header.textContent())?.trim(), 'Empty heading: ' + section);
        await assertLayout(page, name + '/demo/' + section);
      }
    });

    if (width < 1024) {
      await step(name + ' demo: mobile loadout sheet', async () => {
        await page.getByRole('button', { name: 'Open demo loadout' }).click();
        const modal = page.getByRole('dialog', { name: 'Demo loadout' });
        await modal.waitFor();
        assert.ok(await modal.getByText('AKTIVES LOADOUT').isVisible());
        await modal.getByRole('button', { name: 'Close demo loadout' }).click();
        await modal.waitFor({ state: 'hidden' });
      });
    }

    await step(name + ' public routes and guest protection', async () => {
      await page.goto(base + '/imprint', { waitUntil: 'domcontentloaded' });
      await page.locator('h1').first().waitFor();
      await page.goto(base + '/privacy', { waitUntil: 'domcontentloaded' });
      await page.locator('h1').first().waitFor();
      await page.goto(base + '/lost-sector-404', { waitUntil: 'domcontentloaded' });
      await page.getByText('Signal verloren.').waitFor();
      await page.screenshot({ path: `artifacts/guardian-e2e/${name}-404.png` });
      await page.goto(base + '/share/not-a-real-build', { waitUntil: 'domcontentloaded' });
      await page.locator('h1').first().waitFor();
      await page.goto(base + '/dashboard', { waitUntil: 'domcontentloaded' });
      await page.waitForURL(u => u.pathname === '/', { timeout: 15_000 });
      await assertLayout(page, name + '/unauthenticated');
    });
    await context.close();
  }

  for (const { name, width, height } of [
    { name: 'phone', width: 390, height: 844 },
    { name: 'desktop', width: 1440, height: 900 },
  ]) {
    const context = await browser.newContext({
      viewport: { width, height }, reducedMotion: 'reduce',
    });
    await context.route('**/api/auth/me', r => r.fulfill({ json: profile }));
    await context.route('**/api/bungie/profile-state/**', r => r.fulfill({ json: state }));
    await context.route('**/api/loadouts/123', r => r.fulfill({ json: [] }));
    await context.route('**/api/premium/status', r => r.fulfill({
      json: { isPremium: false, aiUsage: { used: 0, limit: 5, remaining: 5 } },
    }));
    await context.route('**/api/bungie/news?*', r => r.fulfill({ json: [] }));
    await context.route('**/api/bungie/activity-history/**', r => r.fulfill({ json: [] }));
    const page = await context.newPage();
    bindRuntimeErrors(page, 'dashboard/' + name);
    await step(name + ' connected dashboard: character loads', async () => {
      await page.goto(base + '/dashboard', { waitUntil: 'domcontentloaded' });
      await page.getByTestId('text-power-level').waitFor({ timeout: 16_000 });
      assert.match(await page.getByTestId('text-power-level').innerText(), /2000/);
      await assertLayout(page, name + '/dashboard/characters');
      await page.screenshot({ path: `artifacts/guardian-e2e/${name}-dashboard.png` });
    });
    async function tab(section) {
      if (width < 768) {
        if (['characters', 'vault', 'loadouts', 'postmaster'].includes(section)) {
          await page.getByTestId('bottom-tab-' + section).click();
        } else {
          await page.getByTestId('bottom-tab-more').click();
          await page.getByTestId('menu-item-' + (section === 'characters' ? 'guardian' : section)).click();
        }
      } else {
        const order = [
          'characters', 'vault', 'loadouts', 'postmaster', 'collections',
          'triumphs', 'season', 'activity', 'ai', 'news',
        ];
        const nav = page.getByRole('navigation', { name: 'GuardianGrid sections' });
        await nav.locator('button').nth(order.indexOf(section)).click();
      }
    }
    await step(name + ' connected dashboard: vault and equipment', async () => {
      await tab('vault');
      const search = page.getByTestId('input-search-vault');
      await search.waitFor({ timeout: 12000 });
      assert.equal(await page.locator('[data-testid^="vault-item-"]').count(), 2);
      await search.fill('Witherhoard');
      assert.equal(await page.locator('[data-testid^="vault-item-"]').count(), 1);
      await page.getByTestId('vault-item-v1').click();
      await page.getByTestId('detail-action-loadout').click();
      await page.getByTestId('item-detail-modal').waitFor({ state: 'hidden' });
      await search.fill('');
      if (width < 1024) {
        await page.getByTestId('button-mobile-loadout').click();
        const dialog = page.getByRole('dialog', { name: 'Active loadout' });
        await dialog.waitFor();
        await dialog.getByRole('button', { name: 'Close loadout' }).click();
      }
      await assertLayout(page, name + '/dashboard/vault');
    });
    await step(name + ' connected dashboard: navigation and lazy panels', async () => {
      for (const section of ['loadouts', 'postmaster', 'collections', 'triumphs', 'season', 'activity', 'ai', 'news', 'characters']) {
        await tab(section);
        await page.getByTestId('text-header-title').waitFor({ timeout: 10000 });
        await page.waitForTimeout(120);
        await assertLayout(page, name + '/dashboard/' + section);
      }
    });
    await context.close();
  }
  assert.deepEqual(failures, [], 'Uncaught browser runtime errors');
  console.log('PASS GUARDIANGRID DEEP E2E: ' + results.length + ' scenarios ' + JSON.stringify(results));
} catch (err) {
  console.error('FAIL E2E', err);
  if (failures.length) console.error('Browser exceptions: ' + failures.join(' | '));
  process.exitCode = 1;
} finally {
  await browser.close();
}
