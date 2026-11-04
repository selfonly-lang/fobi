import { NextRequest, NextResponse } from "next/server";
import {
  ACCESS,
  REFRESH,
  setSession,
  clearSession,
  trustedRequest,
  authPost,
} from "@/lib/server-auth";
import { DB, CORE, PUBLISHABLE } from "@/lib/catalog";
import { safeReturn, PLATFORM } from "@/lib/domain";
import { random, challenge } from "@/lib/oauth";
export async function GET(req: NextRequest) {
  const action = req.nextUrl.searchParams.get("action");
  if (action === "start") {
    if (process.env.SELF_PAGEANT_IDENTITY_ENABLED !== "true")
      return NextResponse.redirect(
        PLATFORM + "/login?error=self_identity_pending",
      );
    const verifier = random(),
      state = random();
    const target = new URL("https://fobi.self.com.tw/api/member");
    target.searchParams.set("action", "pageant-start");
    target.searchParams.set("state", state);
    target.searchParams.set("challenge", challenge(verifier));
    target.searchParams.set(
      "provider",
      req.nextUrl.searchParams.get("provider") === "line" ? "line" : "self",
    );
    const res = NextResponse.redirect(target);
    res.cookies.set(
      "__Host-pageant_oauth",
      Buffer.from(
        JSON.stringify({
          state,
          verifier,
          returnTo: safeReturn(req.nextUrl.searchParams.get("returnTo")),
          expires: Date.now() + 600000,
        }),
      ).toString("base64url"),
      { secure: true, httpOnly: true, sameSite: "lax", path: "/", maxAge: 600 },
    );
    res.headers.set("Cache-Control", "no-store");
    return res;
  }
  if (action === "status")
    return NextResponse.json({
      ok: true,
      providers:
        process.env.SELF_PAGEANT_IDENTITY_ENABLED === "true"
          ? ["self", "line"]
          : [],
      legacy_password: true,
    });
  return NextResponse.json({ ok: false, error: "操作不存在" }, { status: 404 });
}
export async function POST(req: NextRequest) {
  if (!trustedRequest(req))
    return NextResponse.json(
      { ok: false, error: "請從網站內操作" },
      { status: 403 },
    );
  const action = req.nextUrl.searchParams.get("action");
  const headers = { "Cache-Control": "private, no-store" };
  try {
    if (action === "logout") {
      const token = req.cookies.get(ACCESS)?.value;
      if (token)
        await fetch(DB + "/auth/v1/logout?scope=local", {
          method: "POST",
          headers: { apikey: PUBLISHABLE, Authorization: "Bearer " + token },
          signal: AbortSignal.timeout(10000),
        }).catch(() => null);
      const res = NextResponse.json({ ok: true }, { headers });
      clearSession(res);
      return res;
    }
    const b = await req.json();
    if (
      typeof b.email !== "string" ||
      b.email.length > 254 ||
      !/^\S+@\S+\.\S+$/.test(b.email)
    )
      return NextResponse.json(
        { ok: false, error: "請填寫有效Email" },
        { status: 400, headers },
      );
    if (action === "login-code") {
      const d = await authPost("otp", { email: b.email, create_user: false });
      return NextResponse.json(
        {
          ok: d.r.ok,
          ...(!d.r.ok
            ? { error: "驗證信暫時無法寄送，請使用既有會員密碼登入。" }
            : { message: "若此信箱已有SHE會員，將寄送登入驗證信。" }),
        },
        { status: d.r.ok ? 200 : 400, headers },
      );
    }
    if (!["password", "verify-code"].includes(action || ""))
      return NextResponse.json(
        { ok: false, error: "操作不存在" },
        { status: 404 },
      );
    if (
      action === "password" &&
      (typeof b.password !== "string" || b.password.length > 256)
    )
      throw Error();
    if (action === "verify-code" && !/^\d{6,10}$/.test(b.code || ""))
      throw Error();
    const d = await authPost(
      action === "password" ? "token?grant_type=password" : "verify",
      action === "password"
        ? { email: b.email, password: b.password }
        : { email: b.email, token: b.code, type: "email" },
    );
    if (!d.r.ok)
      return NextResponse.json(
        { ok: false, error: "登入失敗，請確認會員資料或驗證碼" },
        { status: 401, headers },
      );
    const r = await fetch(CORE + "?action=me", {
      headers: { Authorization: "Bearer " + d.data.access_token },
      cache: "no-store",
    });
    if (!r.ok)
      return NextResponse.json(
        { ok: false, error: "無法讀取會員資料，請稍後重試" },
        { status: 503, headers },
      );
    const res = NextResponse.json({ ok: true }, { headers });
    setSession(res, d.data);
    return res;
  } catch {
    return NextResponse.json(
      { ok: false, error: "登入暫時無法完成，請稍後重試" },
      { status: 400, headers },
    );
  }
}
