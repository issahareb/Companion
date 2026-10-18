import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const base = process.env.GG_PREVIEW_URL || 'http://127.0.0.1:4173';
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
let count = 0;

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  let loggedIn = false;
  let exchangeBody = null;
  let loginPosts = 0;
  const profile = { membershipId: '777', membershipType: 3, displayName: 'OAuthGuardian', iconPath: '' };
  await context.route('**/api/config/turnstile', r => r.fulfill({ json: { enabled: false, siteKey: '' } }));
  await context.route('**/api/auth/me', r => r.fulfill(loggedIn ? { json: profile } : { status: 401, json: { message: 'Not authenticated' } }));
  await context.route('**/api/auth/login', async r => {
    loginPosts++;
    exchangeBody = r.request().postDataJSON();
    loggedIn = true;
    await r.fulfill({ json: profile });
  });
  await context.route('**/api/auth/logout', async r => { loggedIn = false; await r.fulfill({ json: { success: true } }); });
  await context.route('**/api/bungie/profile-state/**', r => r.fulfill({ json: {
    characters: [{ characterId: 'test-hunter', classType: 1, className: 'Hunter',
      raceName: 'Awoken', light: 2000, emblemPath: '', emblemBackgroundPath: '',
      dateLastPlayed: '2026-10-18T00:00:00Z', stats: [], equippedItems: [],
      inventory: [], quests: [], progressions: [] }],
    vaultItems: [], postmasterItems: [], currencies: [], collectibles: [], records: [],
    inGameLoadouts: {},
  }}));
  await context.route('**/api/loadouts/777', r => r.fulfill({ json: [] }));
  await context.route('**/api/premium/status', r => r.fulfill({ json: {
    isPremium: false, aiUsage: { used: 0, limit: 5, remaining: 5 },
  }}));
  await context.route('https://www.bungie.net/en/OAuth/Authorize**', r => r.fulfill({
    status: 200, contentType: 'text/html',
    body: '<html><body><h1>Simulated Bungie OAuth consent</h1></body></html>',
  }));

  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push(e.message));

  await page.goto(base + '/', { waitUntil: 'domcontentloaded' });
  await page.getByTestId('button-login').waitFor();
  await page.getByTestId('button-login').click();
  await page.waitForURL(u => u.hostname === 'www.bungie.net', { timeout: 15000 });
  const authUrl = new URL(page.url());
  assert.equal(authUrl.searchParams.get('client_id'), '51625');
  const state = authUrl.searchParams.get('state');
  assert.match(state || '', /^[0-9a-f]{48}$/);
  console.log('PASS OAUTH: unpredictable 192-bit state attached to Bungie redirect');
  count++;

  await page.goto(base + '/?code=mock-authorization-code&state=' + state, { waitUntil: 'domcontentloaded' });
  await page.getByTestId('text-power-level').waitFor({ timeout: 16000 });
  assert.equal(loginPosts, 1);
  assert.equal(exchangeBody.code, 'mock-authorization-code');
  assert.match(await page.getByTestId('text-power-level').innerText(), /2000/);
  assert.equal(new URL(page.url()).pathname, '/dashboard');
  console.log('PASS OAUTH: callback state accepted, login exchanged, dashboard entered');
  count++;

  await page.getByRole('button', { name: /logout/i }).first().click();
  await page.waitForURL(u => u.pathname === '/', { timeout: 12000 });
  await page.getByTestId('button-login').waitFor({ timeout: 12000 });
  assert.equal(loggedIn, false);
  console.log('PASS OAUTH: logout clears authenticated state');
  count++;

  await page.goto(base + '/?code=attacker-code&state=invalid', { waitUntil: 'domcontentloaded' });
  await page.getByText(/Sicherheitsprüfung der Bungie-Anmeldung fehlgeschlagen/i).waitFor({ timeout: 12000 });
  assert.equal(loginPosts, 1, 'Tampered OAuth callback exchanged an authorization code');
  console.log('PASS OAUTH: mismatched/missing state rejected without exchanging code');
  count++;

  await page.goto(base + '/?error=access_denied', { waitUntil: 'domcontentloaded' });
  await page.getByText(/abgebrochen oder von Bungie abgelehnt/i).waitFor({ timeout: 12000 });
  console.log('PASS OAUTH: canceled authorization has recoverable error state');
  count++;

  assert.deepEqual(pageErrors, [], 'Client-side uncaught exceptions');
  await context.close();
  console.log('PASS GUARDIANGRID OAUTH BROWSER: ' + count + ' scenarios');
} catch (error) {
  console.error('FAIL GUARDIANGRID OAUTH BROWSER', error);
  process.exitCode = 1;
} finally {
  await browser.close();
}
