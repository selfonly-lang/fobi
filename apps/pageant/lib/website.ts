import { cache } from "react";
import type { Metadata } from "next";
import { CORE } from "./catalog";
import { DEFAULT_WEBSITE, type WebsiteContent } from "./website-types";
import { MISS_TAIWAN } from "./miss-taiwan";
export const getWebsite = cache(
  async (project: string): Promise<WebsiteContent> => {
    const r = await fetch(
      CORE + "?action=ops-site&project=" + encodeURIComponent(project),
      { cache: "no-store", signal: AbortSignal.timeout(15000) },
    );
    if (!r.ok) throw Error("官網設定暫時無法載入，請稍後重試。");
    const d = await r.json();
    return d.content || DEFAULT_WEBSITE;
  },
);
export async function taiwanMetadata(): Promise<Metadata> {
  const c = await getWebsite(MISS_TAIWAN.project_id);
  return {
    title: "2027 " + c.brand_name,
    description: c.about_body.slice(0, 200),
    alternates: { canonical: "https://misstaiwan.self.com.tw/" },
    openGraph: {
      title: "2027 " + c.brand_name + "｜" + c.headline.replaceAll("\n", ""),
      url: "https://misstaiwan.self.com.tw/",
      images: [
        {
          url: new URL(c.hero_photo.url, "https://pageant.self.com.tw").href,
          alt: c.hero_photo.alt,
        },
      ],
    },
  };
}
