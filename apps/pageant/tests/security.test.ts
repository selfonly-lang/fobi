import test from "node:test";
import assert from "node:assert/strict";
import { siteForHost, safeReturn, videoEmbed } from "../lib/domain.ts";
import { random, challenge, seal, unseal, equal } from "../lib/oauth.ts";
test("known hosts are explicit; lookalike and arbitrary Vercel hosts rejected", () => {
  assert.equal(siteForHost("FOBI.SELF.COM.TW")?.slug, "fobi");
  assert.equal(siteForHost("misstaiwan.self.com.tw")?.slug, "miss-taiwan");
  for (const h of [
    "evil.example",
    "fobi.self.com.tw.evil.example",
    "attacker.vercel.app",
    "self.com.tw",
  ])
    assert.equal(siteForHost(h), null);
});
test("login returns remain on central member routes", () => {
  for (const v of [
    "https://evil.example/account",
    "//evil.example/account",
    "javascript:alert(1)",
    "/api/member",
    "/news/private",
  ])
    assert.equal(safeReturn(v), "/account");
  assert.equal(safeReturn("/studio?project=abc"), "/studio?project=abc");
  assert.equal(safeReturn("/activities/abc"), "/activities/abc");
  assert.equal(safeReturn("/checkout?activity=abc"), "/checkout?activity=abc");
});
test("PKCE S256 matches RFC7636", () => {
  assert.equal(
    challenge("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"),
    "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
  );
  assert.match(random(), /^[A-Za-z0-9_-]{43}$/);
});
test("OAuth cookies authenticated, encrypted and expire", () => {
  const key = random(),
    d = { state: random(), verifier: random(), expires: Date.now() + 60000 },
    cookie = seal(d, key);
  assert.deepEqual(unseal(cookie, key), d);
  assert.ok(!cookie.includes(d.verifier));
  assert.throws(() => unseal(cookie, random()));
  const parts = cookie.split(".");
  parts[1] = (parts[1][0] === "a" ? "b" : "a") + parts[1].slice(1);
  assert.throws(() => unseal(parts.join("."), key));
  assert.throws(() =>
    unseal(seal({ ...d, expires: Date.now() - 1 }, key), key),
  );
  assert.equal(equal("same", "same"), true);
  assert.equal(equal("same", "other"), false);
});
test("external video embeds use validated identifiers", () => {
  assert.equal(
    videoEmbed("youtube", "dQw4w9WgXcQ"),
    "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
  );
  assert.equal(
    videoEmbed("vimeo", "12345"),
    "https://player.vimeo.com/video/12345",
  );
  assert.equal(videoEmbed("youtube", "https://evil.example"), null);
  assert.equal(videoEmbed("vimeo", "123?x=y"), null);
});
