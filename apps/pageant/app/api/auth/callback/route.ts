import { NextRequest, NextResponse } from "next/server";
import { CORE } from "@/lib/catalog";
import { setSession } from "@/lib/server-auth";
import { equal } from "@/lib/oauth";
import { PLATFORM, safeReturn } from "@/lib/domain";
export async function GET(req: NextRequest) {
  const clear = (r: NextResponse) => {
    r.cookies.set("__Host-pageant_oauth", "", {
      secure: true,
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
    r.headers.set("Cache-Control", "no-store");
    return r;
  };
  try {
    const encoded = req.cookies.get("__Host-pageant_oauth")?.value;
    if (!encoded) throw Error();
    const flow = JSON.parse(Buffer.from(encoded, "base64url").toString());
    if (
      flow.expires < Date.now() ||
      req.nextUrl.searchParams.getAll("state").length !== 1 ||
      !equal(flow.state, req.nextUrl.searchParams.get("state") || "")
    )
      throw Error();
    const code = req.nextUrl.searchParams.get("code");
    if (!code || req.nextUrl.searchParams.has("error")) throw Error();
    const r = await fetch(CORE + "?action=auth-consume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, verifier: flow.verifier }),
        cache: "no-store",
        signal: AbortSignal.timeout(20000),
      }),
      d = await r.json();
    if (!r.ok || !d.session?.access_token) throw Error();
    const res = clear(
      NextResponse.redirect(new URL(safeReturn(flow.returnTo), PLATFORM)),
    );
    setSession(res, d.session);
    return res;
  } catch {
    return clear(
      NextResponse.redirect(PLATFORM + "/login?error=authorization_failed"),
    );
  }
}
