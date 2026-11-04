import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { resolveSite } from "@/lib/site";
export default async function robots(): Promise<MetadataRoute.Robots> {
  const s = await resolveSite((await headers()).get("host") || "");
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/studio",
        "/account",
        "/login",
        "/checkout",
        "/create",
        "/invite",
        "/preview",
        "/api/",
      ],
    },
    sitemap: (s?.origin || "https://pageant.self.com.tw") + "/sitemap.xml",
  };
}
