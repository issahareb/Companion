import assert from 'node:assert/strict';
import { createHmac, randomUUID } from 'node:crypto';
import pg from 'pg';

const url = process.env.GG_API_TEST_URL || 'http://127.0.0.1:4174';
const secret = process.env.SESSION_SECRET;
const connectionString = process.env.DATABASE_URL;
if (!secret || !connectionString) throw new Error('Missing isolated integration-test configuration');
const pool = new pg.Pool({ connectionString, max: 2 });
const results = [];
async function verify(name, method, path, expected, options = {}) {
  const response = await fetch(url + path, {
    method,
    headers: {
      'user-agent': 'GuardianGrid-CI/1.0',
      ...(options.headers || {}),
      ...(options.body ? { 'content-type': 'application/json' } : {}),
    },
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  });
  const text = await response.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text; }
  assert.equal(response.status, expected, name + ' ' + response.status + ': ' + text.slice(0, 600));
  if (path.startsWith('/api/')) {
    assert.match(response.headers.get('cache-control') || '', /no-store/i, name + ' missing no-store');
  }
  results.push(name);
  console.log('PASS API ' + name);
  return { body, response };
}
try {
  const id = randomUUID();
  const membership = 'ci-player-123';
  const expiry = new Date(Date.now() + 3600_000);
  await pool.query(
    `INSERT INTO companion.sessions
     (id, bungie_membership_id, access_token, refresh_token, token_expires_at, absolute_expiry)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [id, membership, 'ci-test-only-access-token', null, expiry, expiry],
  );
  const mac = createHmac('sha256', secret).update(id).digest('base64').replace(/=+$/, '');
  const signedCookie = 'session_id=' + encodeURIComponent('s:' + id + '.' + mac);
  const auth = { cookie: signedCookie };
  const foreign = { origin: 'https://untrusted.example' };

  await verify('healthz', 'GET', '/healthz', 200);
  const { body: cfg } = await verify('turnstile disabled without server keys', 'GET', '/api/config/turnstile', 200);
  assert.equal(cfg.enabled, false);

  await verify('guest profile rejected', 'GET', '/api/auth/me', 401);
  await verify('guest loadouts rejected', 'GET', '/api/loadouts/' + membership, 401);
  await verify('guest write rejected', 'POST', '/api/bungie/equip', 401, { body: {} });
  await verify('cross-site changes rejected', 'POST', '/api/loadouts', 403, { headers: foreign, body: {} });
  await verify('unauthorized membership rejected', 'GET', '/api/loadouts/another-user', 403, { headers: auth });
  await verify('malformed loadout rejected', 'POST', '/api/loadouts', 400, { headers: auth, body: { name: '', items: {} } });
  await verify('invalid loadout ID rejected', 'DELETE', '/api/loadouts/definitely-invalid', 400, { headers: auth });

  const payload = { name: 'GuardianGrid CI Loadout', items: {
    kinetic: { id: 'test-instance-1', itemHash: 12345, slot: 'kinetic', name: 'Test Weapon', rarity: 'legendary', type: 'Auto Rifle', power: 2000, icon: '', screenshot: '' },
  }};
  const created = await verify('create loadout', 'POST', '/api/loadouts', 201, { headers: auth, body: payload });
  assert.equal(created.body.name, payload.name);
  assert.equal(created.body.bungieMembershipId, membership);
  assert.ok(created.body.shareCode);
  assert.ok(Number.isInteger(created.body.id));
  const found = await verify('list personal loadouts', 'GET', '/api/loadouts/' + membership, 200, { headers: auth });
  assert.ok(found.body.some(row => row.id === created.body.id), 'Created loadout missing from list');
  const share = await verify('public share link', 'GET', '/api/loadouts/share/' + created.body.shareCode, 200);
  assert.equal(share.body.id, created.body.id);

  await verify('delete owned loadout', 'DELETE', '/api/loadouts/' + created.body.id, 200, { headers: auth });
  const after = await verify('loadout removed from list', 'GET', '/api/loadouts/' + membership, 200, { headers: auth });
  assert.equal(after.body.length, 0);
  await verify('deleted share link returns 404', 'GET', '/api/loadouts/share/' + created.body.shareCode, 404);

  const response = await fetch(url + '/healthz');
  assert.ok((response.headers.get('content-security-policy') || '').includes("object-src 'none'"));
  console.log('PASS API end-to-end: ' + results.length + ' checks ' + JSON.stringify(results));
} finally {
  await pool.query('DELETE FROM companion.sessions WHERE bungie_membership_id = $1', ['ci-player-123']).catch(() => {});
  await pool.end();
}
