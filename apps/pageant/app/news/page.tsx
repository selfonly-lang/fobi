import { headers } from "next/headers";
import type { Metadata } from "next";
import { getCatalog } from "@/lib/catalog";
import { resolveSite } from "@/lib/site";
import { NewsExplorer } from "@/components/explorers";
export const metadata: Metadata = { title: "選美誌・新聞與人物故事" };
export default async function News() {
  const data = await getCatalog(),
    site = await resolveSite((await headers()).get("host") || "");
  const brand = data.brands.find((b) => b.slug === site?.slug),
    projects =
      site?.kind === "brand"
        ? data.projects.filter((p) => p.brand_id === brand?.id)
        : data.projects,
    ids = new Set(projects.map((p) => p.id));
  const articles =
    site?.kind === "brand"
      ? data.articles.filter((a) => a.project_id && ids.has(a.project_id))
      : data.articles;
  return (
    <section className="wrap section">
      <div className="page-intro">
        <span className="eyebrow">THE PAGEANT JOURNAL</span>
        <h1>
          每一份美，
          <br />
          都有自己的故事。
        </h1>
        <p>閱讀賽事、人物與品牌，走進舞台之外的世界。</p>
      </div>
      <NewsExplorer articles={articles} projects={data.projects} />
      {site?.slug === "fobi" && (
        <div className="download-note">
          <a className="text-link" href="/news/downloads/">
            FOBI 結案文稿與圖文書下載 ↗
          </a>
        </div>
      )}
    </section>
  );
}
