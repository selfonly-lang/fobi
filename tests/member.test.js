import test from 'node:test';
import assert from 'node:assert/strict';
import handler, { contactOnly, checkoutPath, seal, unseal } from '../api/member.js';

const secret = 'test-only-secret-with-at-least-32-characters';
const origin = 'https://fobi.self.com.tw';
function response() {
  return { headers: {}, statusCode: 200, setHeader(k, v) { this.headers[k] = v; }, status(n) { this.statusCode = n; return this; }, json(data) { this.data = data; return this; }, end() {} };
}
function configure() { process.env.SELF_OAUTH_ENABLED = 'true'; process.env.SELF_OAUTH_CLIENT_ID = '110f8bcac14942a245d48bb6e0beab5e'; process.env.SELF_OAUTH_CLIENT_SECRET = secret; }

test('only the three contact fields can leave the bridge', () => {
  assert.deepEqual(contactOnly({ name: ' Jane ', phone: ' 0912345678 ', email: ' jane@example.test ', sub: 'private-id', membership: { tier: 'vip' }, avatar_url: 'https://example.test/photo', lifetime_points: 100 }), { name: 'Jane', phone: '0912345678', email: 'jane@example.test' });
  assert.deepEqual(contactOnly({ name: {}, email: null }), { name: '', phone: '', email: '' });
});
test('return paths cannot redirect outside checkout or retain personal query data', () => {
  assert.throws(() => checkoutPath('https://evil.test/checkout.html'));
  assert.throws(() => checkoutPath('//evil.test/checkout.html'));
  assert.throws(() => checkoutPath('/admin.html'));
  assert.equal(checkoutPath('/checkout.html?type=sponsor&tier=VIP%202&email=private'), '/checkout.html?type=sponsor&tier=VIP+2');
});
test('encrypted cookies reject tampering, wrong purpose and expiration', () => {
  const sealed = seal({ exp: Date.now() + 60000, name: 'private-name' }, secret, 'profile');
  assert.equal(unseal(sealed, secret, 'profile').name, 'private-name');
  assert.ok(!sealed.includes('private-name'));
  assert.throws(() => unseal(sealed, secret, 'flow'));
  const tampered = Buffer.from(sealed, 'base64url');
  tampered[10] ^= 1;
  assert.throws(() => unseal(tampered.toString('base64url'), secret, 'profile'));
  assert.throws(() => unseal(seal({ exp: Date.now() - 1 }, secret, 'profile'), secret, 'profile'));
});
test('no configuration means unavailable, with no credentials exposed', async () => {
  delete process.env.SELF_OAUTH_CLIENT_ID;
  delete process.env.SELF_OAUTH_CLIENT_SECRET;
  const res = response();
  await handler({ url: '/api/member', method: 'GET', headers: {} }, res);
  assert.deepEqual(res.data, { available: false });
  const start = response();
  await handler({ url: '/api/member?action=start', method: 'POST', headers: { origin } }, start);
  assert.equal(start.statusCode, 503);
});
test('each provider uses PKCE and contact scope; cross-origin starts are denied', async () => {
  configure();
  for (const provider of ['google', 'line', 'facebook', 'apple']) {
    const res = response();
    await handler({ url: '/api/member?action=start', method: 'POST', headers: { origin }, body: { provider, returnPath: '/checkout.html?type=sponsor&tier=VIP%201' } }, res);
    assert.equal(res.statusCode, 200);
    const url = new URL(res.data.url);
    assert.equal(url.origin, 'https://www.self.com.tw');
    assert.equal(url.searchParams.get('connection'), provider);
    assert.equal(url.searchParams.get('scope'), 'contact');
    assert.equal(url.searchParams.get('code_challenge_method'), 'S256');
    assert.equal(url.searchParams.get('code_challenge').length, 43);
    assert.ok(!JSON.stringify(res.data).includes(secret));
    assert.match(res.headers['Set-Cookie'][0], /HttpOnly; Secure; SameSite=Lax/);
  }
  const denied = response();
  await handler({ url: '/api/member?action=start', method: 'POST', headers: { origin: 'https://evil.test' }, body: { provider: 'google' } }, denied);
  assert.equal(denied.statusCode, 403);
});
test('invalid callback state never exchanges a token and preserves sponsor selection', async () => {
  configure();
  const flow = seal({ state: 'expected', verifier: 'test', returnPath: '/checkout.html?type=sponsor&tier=VIP+3', exp: Date.now() + 60000 }, secret, 'flow');
  const original = globalThis.fetch;
  globalThis.fetch = () => { assert.fail('invalid state must not call SELF'); };
  try {
    const res = response();
    await handler({ url: '/api/member?action=callback&code=bad&state=wrong', method: 'GET', headers: { cookie: `__Host-fobi_oauth=${flow}` } }, res);
    assert.equal(res.headers.Location, '/checkout.html?type=sponsor&tier=VIP+3&member_result=error');
    assert.match(res.headers['Set-Cookie'][0], /Max-Age=0/);
  } finally { globalThis.fetch = original; }
});
test('valid callback exchanges server-side and provides a filtered contact cookie cleared after retrieval', async () => {
  configure();
  const flow = seal({ state: 'expected', verifier: 'test-verifier', returnPath: '/checkout.html?type=ticket', exp: Date.now() + 60000 }, secret, 'flow');
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async (url, options) => {
    calls++;
    if (url.endsWith('oauth-token')) {
      assert.equal(JSON.parse(options.body).code_verifier, 'test-verifier');
      return { ok: true, json: async () => ({ access_token: 'server-only-token' }) };
    }
    assert.equal(options.headers.Authorization, 'Bearer server-only-token');
    return { ok: true, json: async () => ({ name: 'Jane', email: 'jane@example.test', phone: '', sub: 'discard', avatar_url: 'discard' }) };
  };
  try {
    const res = response();
    await handler({ url: '/api/member?action=callback&code=good&state=expected&self_name=FORGED', method: 'GET', headers: { cookie: `__Host-fobi_oauth=${flow}` } }, res);
    assert.equal(calls, 2);
    assert.equal(res.headers.Location, '/checkout.html?type=ticket&member_result=success');
    const cookie = res.headers['Set-Cookie'][1].split(';')[0];
    assert.ok(!cookie.includes('server-only-token'));
    const profile = response();
    await handler({ url: '/api/member?action=profile', method: 'POST', headers: { origin, cookie } }, profile);
    assert.deepEqual(profile.data, { contact: { name: 'Jane', phone: '', email: 'jane@example.test' } });
    assert.match(profile.headers['Set-Cookie'], /Max-Age=0/);
    assert.equal(profile.headers['Cache-Control'], 'no-store');
  } finally { globalThis.fetch = original; }
});
