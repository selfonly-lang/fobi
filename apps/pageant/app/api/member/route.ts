// Keep the existing registered FOBI callback; credentials stay in its current Vercel project.
import { NextRequest, NextResponse } from "next/server";
import { random, challenge, seal, unseal, equal } from "@/lib/oauth";
import { CORE } from "@/lib/catalog";
import { PLATFORM } from "@/lib/domain";
const COOKIE = "__Host-pageant_self",
  CALLBACK = "https://fobi.self.com.tw/api/member?action=callback";
const SELF = "https://llyjfsxpdylaejqlcyac.supabase.co/functions/v1";
export async function GET(req: NextRequest) {
  const client = process.env.SELF_OAUTH_CLIENT_ID,
    secret = process.env.SELF_OAUTH_CLIENT_SECRET;
  const action = req.nextUrl.searchParams.get("action");
  const error = () => {
    const r = NextResponse.redirect(PLATFORM + "/login?error=self_unavailable");
    r.cookies.set(COOKIE, "", {
      secure: true,
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
    return r;
  };
  if (
    !client ||
    !secret ||
    process.env.SELF_PAGEANT_IDENTITY_ENABLED !== "true" ||
    req.headers.get("host") !== "fobi.self.com.tw"
  )
    return error();
  if (action === "pageant-start") {
    const state = req.nextUrl.searchParams.get("state") || "",
      pkce = req.nextUrl.searchParams.get("challenge") || "";
    if (!/^[A-Za-z0-9_-]{43}$/.test(state) || !/^[A-Za-z0-9_-]{43}$/.test(pkce))
      return error();
    const verifier = random(),
      oauthState = random(),
      auth = new URL("https://www.self.com.tw/oauth/authorize");
    const params: Record<string, string> = {
      client_id: client,
      redirect_uri: CALLBACK,
      response_type: "code",
      scope: "profile",
      state: oauthState,
      code_challenge: challenge(verifier),
      code_challenge_method: "S256",
    };
    if (req.nextUrl.searchParams.get("provider") === "line")
      params.connection = "line";
    Object.entries(params).forEach(([k, v]) => auth.searchParams.set(k, v));
    const res = NextResponse.redirect(auth);
    res.cookies.set(
      COOKIE,
      seal(
        {
          state,
          challenge: pkce,
          oauthState,
          verifier,
          expires: Date.now() + 600000,
        },
        secret,
      ),
      { secure: true, httpOnly: true, sameSite: "lax", path: "/", maxAge: 600 },
    );
    res.headers.set("Cache-Control", "no-store");
    return res;
  }
  if (action === "callback") {
    let token: { access_token?: string; refresh_token?: string } | null = null;
    try {
      const flow = unseal(req.cookies.get(COOKIE)?.value || "", secret);
      if (
        !equal(flow.oauthState, req.nextUrl.searchParams.get("state") || "") ||
        req.nextUrl.searchParams.has("error")
      )
        throw Error();
      const code = req.nextUrl.searchParams.get("code");
      if (!code || code.length > 2000) throw Error();
      const exchange = await fetch(SELF + "/oauth-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grant_type: "authorization_code",
          code,
          client_id: client,
          client_secret: secret,
          redirect_uri: CALLBACK,
          code_verifier: flow.verifier,
        }),
        signal: AbortSignal.timeout(15000),
      });
      token = await exchange.json();
      if (!exchange.ok || !token?.access_token) throw Error();
      const r = await fetch(CORE + "?action=auth-exchange", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            self_token: token.access_token,
            challenge: flow.challenge,
          }),
          signal: AbortSignal.timeout(20000),
        }),
        d = await r.json();
      if (!r.ok || !d.code) throw Error();
      const url = new URL(PLATFORM + "/api/auth/callback");
      url.searchParams.set("state", flow.state);
      url.searchParams.set("code", d.code);
      const res = NextResponse.redirect(url);
      res.cookies.set(COOKIE, "", {
        secure: true,
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 0,
      });
      res.headers.set("Cache-Control", "no-store");
      return res;
    } catch {
      return error();
    } finally {
      if (token?.access_token)
        await Promise.all(
          [token.access_token, token.refresh_token]
            .filter(Boolean)
            .map((t) =>
              fetch(SELF + "/oauth-revoke", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token: t }),
                signal: AbortSignal.timeout(5000),
              }).catch(() => null),
            ),
        );
    }
  }
  return NextResponse.json(
    { ok: false, error: "此活動已結案，請使用Pageant會員中心" },
    { status: 410 },
  );
}
