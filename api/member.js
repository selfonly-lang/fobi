import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from 'node:crypto';

const ORIGIN = 'https://fobi.self.com.tw';
const CALLBACK = `${ORIGIN}/api/member?action=callback`;
const SELF_API = 'https://llyjfsxpdylaejqlcyac.supabase.co/functions/v1';
const providers = new Set(['google', 'line', 'facebook', 'apple']);
const FLOW = '__Host-fobi_oauth';
const PROFILE = '__Host-fobi_contact';

export function contactOnly(data) {
  const field = (value, max) => typeof value === 'string' ? value.trim().slice(0, max) : '';
  return { name: field(data.name, 120), phone: field(data.phone, 40), email: field(data.email, 254) };
}

export function checkoutPath(value) {
  const url = new URL(value || '/checkout.html', ORIGIN);
  if (url.origin !== ORIGIN || url.pathname !== '/checkout.html') throw new Error('invalid_return');
  const clean = new URL('/checkout.html', ORIGIN);
  clean.searchParams.set('type', url.searchParams.get('type') === 'sponsor' ? 'sponsor' : 'ticket');
  const tier = url.searchParams.get('tier');
  if (['VIP 1', 'VIP 2', 'VIP 3'].includes(tier)) clean.searchParams.set('tier', tier);
  return clean.pathname + clean.search;
}

export function seal(value, secret, purpose) {
  const key = createHash('sha256').update(`fobi:${purpose}:${secret}`).digest();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(Buffer.from(purpose));
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value)), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64url');
}

export function unseal(value, secret, purpose) {
  const data = Buffer.from(value || '', 'base64url');
  const key = createHash('sha256').update(`fobi:${purpose}:${secret}`).digest();
  const decipher = createDecipheriv('aes-256-gcm', key, data.subarray(0, 12));
  decipher.setAAD(Buffer.from(purpose));
  decipher.setAuthTag(data.subarray(12, 28));
  const result = JSON.parse(Buffer.concat([decipher.update(data.subarray(28)), decipher.final()]).toString());
  if (!Number.isFinite(result.exp) || result.exp <= Date.now()) throw new Error('expired');
  return result;
}

function cookie(name, value, seconds) {
  return `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${seconds}`;
}
function readCookie(req, name) {
  return (req.headers.cookie || '').split(';').map(x => x.trim()).find(x => x.startsWith(name + '='))?.slice(name.length + 1);
}
function sameState(a, b) {
  return typeof a === 'string' && typeof b === 'string' && a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));
}
async function jsonFetch(url, options) {
  const response = await fetch(url, { ...options, signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error('self_unavailable');
  return response.json();
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  const url = new URL(req.url, ORIGIN);
  const action = url.searchParams.get('action') || 'status';
  const clientId = process.env.SELF_OAUTH_CLIENT_ID;
  const secret = process.env.SELF_OAUTH_CLIENT_SECRET;
  const ready = Boolean(process.env.SELF_OAUTH_ENABLED === 'true' && clientId === '110f8bcac14942a245d48bb6e0beab5e' && secret && secret.length >= 32);
  const json = (status, data) => res.status(status).json(data);
  const redirect = (path) => { res.statusCode = 303; res.setHeader('Location', path); res.end(); };
  if (action === 'status' && req.method === 'GET') return json(200, { available: ready });
  if (!ready) return json(503, { error: 'member_login_unavailable' });
  if (['start', 'profile'].includes(action) && (req.method !== 'POST' || req.headers.origin !== ORIGIN)) return json(403, { error: 'invalid_request' });
  if (action === 'start') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      if (!providers.has(body?.provider)) return json(400, { error: 'invalid_provider' });
      const returnPath = checkoutPath(body.returnPath);
      const state = randomBytes(32).toString('base64url');
      const verifier = randomBytes(32).toString('base64url');
      const auth = new URL('https://www.self.com.tw/oauth/authorize');
      Object.entries({ client_id: clientId, redirect_uri: CALLBACK, response_type: 'code', scope: 'contact', connection: body.provider, state, code_challenge: createHash('sha256').update(verifier).digest('base64url'), code_challenge_method: 'S256' }).forEach(([key, value]) => auth.searchParams.set(key, value));
      res.setHeader('Set-Cookie', [cookie(FLOW, seal({ state, verifier, returnPath, exp: Date.now() + 600000 }, secret, 'flow'), 600), cookie(PROFILE, '', 0)]);
      return json(200, { url: auth.toString() });
    } catch { return json(400, { error: 'invalid_request' }); }
  }
  if (action === 'callback' && req.method === 'GET') {
    let returnPath = '/checkout.html';
    res.setHeader('Set-Cookie', [cookie(FLOW, '', 0), cookie(PROFILE, '', 0)]);
    try {
      const flow = unseal(readCookie(req, FLOW), secret, 'flow');
      returnPath = checkoutPath(flow.returnPath);
      if (!sameState(flow.state, url.searchParams.get('state')) || url.searchParams.has('error')) throw new Error('invalid_state');
      const code = url.searchParams.get('code');
      if (!code || code.length > 1024) throw new Error('invalid_code');
      const token = await jsonFetch(`${SELF_API}/oauth-token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ grant_type: 'authorization_code', code, client_id: clientId, client_secret: secret, redirect_uri: CALLBACK, code_verifier: flow.verifier }) });
      if (typeof token.access_token !== 'string') throw new Error('invalid_token');
      const profile = contactOnly(await jsonFetch(`${SELF_API}/oauth-userinfo`, { headers: { Authorization: `Bearer ${token.access_token}` } }));
      res.setHeader('Set-Cookie', [cookie(FLOW, '', 0), cookie(PROFILE, seal({ profile, exp: Date.now() + 300000 }, secret, 'profile'), 300)]);
      return redirect(`${returnPath}&member_result=success`);
    } catch { return redirect(`${returnPath}${returnPath.includes('?') ? '&' : '?'}member_result=error`); }
  }
  if (action === 'profile') {
    res.setHeader('Set-Cookie', cookie(PROFILE, '', 0));
    try { return json(200, { contact: contactOnly(unseal(readCookie(req, PROFILE), secret, 'profile').profile) }); }
    catch { return json(401, { error: 'member_session_expired' }); }
  }
  return json(405, { error: 'method_not_allowed' });
}
