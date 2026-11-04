import { NextRequest, NextResponse } from "next/server";
import { PLATFORM } from "./lib/domain";
import { resolveSite } from "./lib/site";
export async function proxy(req: NextRequest) {
  const site = await resolveSite(req.headers.get("host") || "");
  if (!site) return new NextResponse("網站不存在", { status: 404 });
  const path = req.nextUrl.pathname;
  if (
    [
      "/backoffice",
      "/backoffice/",
      "/admin.html",
      "/platform/admin",
      "/platform/admin/",
    ].includes(path)
  )
    return NextResponse.redirect(PLATFORM + "/studio", 307);
  if (path === "/platform" || path === "/platform/")
    return NextResponse.redirect(
      site.kind === "brand" ? PLATFORM : site.origin,
      308,
    );
  if (
    site.kind === "brand" &&
    /^\/(account|studio|create|checkout|login|invite)(\/|$)/.test(path)
  )
    return NextResponse.redirect(PLATFORM + path + req.nextUrl.search, 307);
  if (site.kind === "platform" && /^\/Fobi(?:\/|$)/.test(path))
    return NextResponse.redirect(
      "https://fobi.self.com.tw" + path + req.nextUrl.search,
      307,
    );
  if (
    site.slug === "fobi" &&
    [
      "/checkout.html",
      "/tickets.html",
      "/sponsors.html",
      "/event.html",
      "/party",
      "/party/",
      "/party.html",
    ].includes(path)
  )
    return NextResponse.redirect(site.origin + "/?notice=event-ended", 307);
  const headers = new Headers(req.headers);
  headers.set("x-pageant-path", path);
  return NextResponse.next({ request: { headers } });
}
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:jpg|jpeg|png|webp|svg|mp4|mp3|woff2|ttf|pdf|zip|docx|txt|css|js)$).*)",
  ],
};
