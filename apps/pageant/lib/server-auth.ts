import { NextRequest, NextResponse } from "next/server";
import { DB, CORE, PUBLISHABLE, WORKSPACE } from "./catalog";
import { siteForHost } from "./domain";
export const ACCESS = "__Host-pageant_access",
  REFRESH = "__Host-pageant_refresh";
export function setSession(
  res: NextResponse,
  d: { access_token: string; refresh_token: string },
) {
  res.cookies.set(ACCESS, d.access_token, {
    secure: true,
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 3600,
  });
  res.cookies.set(REFRESH, d.refresh_token, {
    secure: true,
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 28800,
  });
}
export function clearSession(res: NextResponse) {
  for (const n of [ACCESS, REFRESH])
    res.cookies.set(n, "", {
      secure: true,
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
}
export function trustedRequest(req: NextRequest, post = true) {
  const host = req.headers.get("host") || "";
  if (!siteForHost(host)) return false;
  const protocol =
    host.startsWith("localhost") || host.startsWith("127.0.0.1")
      ? "http"
      : "https";
  return !post || req.headers.get("origin") === protocol + "://" + host;
}
export async function authPost(path: string, data: unknown) {
  const r = await fetch(DB + "/auth/v1/" + path, {
    method: "POST",
    headers: { apikey: PUBLISHABLE, "Content-Type": "application/json" },
    body: JSON.stringify(data),
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  });
  return { r, data: await r.json() };
}
export async function authenticatedProxy(req: NextRequest, legacy = false) {
  const action = req.nextUrl.searchParams.get("action") || "me";
  const headers = { "Cache-Control": "private, no-store" };
  if (!trustedRequest(req, req.method === "POST"))
    return NextResponse.json(
      { ok: false, error: "請從網站內操作" },
      { status: 403, headers },
    );
  if (["auth-consume", "auth-exchange", "payment-callback"].includes(action))
    return NextResponse.json(
      { ok: false, error: "不支援此操作" },
      { status: 403, headers },
    );
  try {
    let token = req.cookies.get(ACCESS)?.value;
    const refresh = req.cookies.get(REFRESH)?.value;
    let session: { access_token: string; refresh_token: string } | null = null;
    const renew = async () => {
      if (!refresh) return false;
      const d = await authPost("token?grant_type=refresh_token", {
        refresh_token: refresh,
      });
      if (!d.r.ok) return false;
      session = d.data;
      token = d.data.access_token;
      return true;
    };
    if (!token) await renew();
    if (!token && !["catalog", "video-playback"].includes(action))
      return NextResponse.json(
        { ok: false, error: "請先登入己美會員" },
        { status: 401, headers },
      );
    const body = req.method === "POST" ? await req.text() : undefined;
    if (body && body.length > 600000)
      return NextResponse.json(
        { ok: false, error: "資料過大" },
        { status: 413, headers },
      );
    const call = () =>
      fetch((legacy ? WORKSPACE : CORE) + "?" + req.nextUrl.searchParams, {
        method: req.method,
        headers: {
          ...(token ? { Authorization: "Bearer " + token } : {}),
          "Content-Type": "application/json",
        },
        ...(body === undefined ? {} : { body }),
        cache: "no-store",
        signal: AbortSignal.timeout(action === "ai-plan" ? 100000 : 25000),
      });
    let r = await call();
    if (r.status === 401 && (await renew())) r = await call();
    const data = await r.json();
    const res = NextResponse.json(data, { status: r.status, headers });
    if (session) setSession(res, session);
    return res;
  } catch {
    return NextResponse.json(
      { ok: false, error: "連線暫時中斷，請稍後重試" },
      { status: 503, headers },
    );
  }
}
