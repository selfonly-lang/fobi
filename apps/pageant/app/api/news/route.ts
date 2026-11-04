import { NextRequest, NextResponse } from "next/server";
import { CORE } from "@/lib/catalog";
export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get("action") !== "image")
    return new NextResponse(null, { status: 404 });
  const p = req.nextUrl.searchParams.get("path") || "";
  const r = await fetch(CORE + "?action=image&path=" + encodeURIComponent(p), {
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    }),
    d = await r.json();
  if (!r.ok || !d.url) return new NextResponse(null, { status: 404 });
  return NextResponse.redirect(d.url, 302);
}
