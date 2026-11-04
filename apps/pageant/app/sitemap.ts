import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { resolveSite } from "@/lib/site";
import { getCatalog, officialArticle } from "@/lib/catalog";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [site, d] = await Promise.all([
    resolveSite((await headers()).get("host") || ""),
    getCatalog(),
  ]);
  if (!site) return [];
  const brand = d.brands.find((b) => b.slug === site.slug),
    ids = new Set(
      d.projects.filter((p) => p.brand_id === brand?.id).map((p) => p.id),
    ),
    articles =
      site.kind === "brand"
        ? d.articles.filter((a) => a.project_id && ids.has(a.project_id))
        : d.articles,
    books =
      site.kind === "brand"
        ? d.publications.filter((b) => ids.has(b.project_id))
        : d.publications;
  return ["", "/news", "/events", "/tv", "/publications"]
    .map((path) => ({ url: site.origin + path }))
    .concat(
      articles.map((a) => ({
        url: officialArticle(a, d.projects),
        lastModified: a.updated_at,
      })),
      books.map((b) => ({
        url: site.origin + "/publications/" + b.slug,
        lastModified: b.updated_at,
      })),
      site.kind === "platform"
        ? d.projects.map((p) => ({ url: site.origin + "/events/" + p.slug }))
        : [],
    );
}
