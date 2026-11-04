import { NextRequest } from "next/server";
import { resolveSite } from "@/lib/site";
export async function GET(req: NextRequest) {
  const host = req.headers.get("host")?.split(":")[0] || "",
    s = await resolveSite(host);
  return Response.json(
    s
      ? { platform: "SELF-PAGEANT-v3", host, brand: s.slug }
      : { error: "網域不存在" },
    { status: s ? 200 : 404, headers: { "Cache-Control": "no-store" } },
  );
}
