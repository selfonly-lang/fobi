import { headers } from "next/headers";
import type { Metadata } from "next";
import { getCatalog } from "@/lib/catalog";
import { resolveSite } from "@/lib/site";
import { BookCard, Empty } from "@/components/public";
export const metadata: Metadata = { title: "電子會刊・賽事與品牌收藏特刊" };
export default async function Publications() {
  const d = await getCatalog(),
    s = await resolveSite((await headers()).get("host") || ""),
    b = d.brands.find((b) => b.slug === s?.slug),
    ids = new Set(
      d.projects.filter((p) => p.brand_id === b?.id).map((p) => p.id),
    ),
    books =
      s?.kind === "brand"
        ? d.publications.filter((p) => ids.has(p.project_id))
        : d.publications;
  return (
    <section className="wrap section">
      <div className="page-intro">
        <span className="eyebrow">THE COLLECTOR’S EDITION</span>
        <h1>
          把一場盛會，
          <br />
          收藏成一本故事。
        </h1>
        <p>從佳麗風采、人物與品牌，到舞台背後的每一份支持。</p>
      </div>
      {books.length ? (
        <div className="story-grid">
          {books.map((p) => (
            <BookCard key={p.id} publication={p} />
          ))}
        </div>
      ) : (
        <Empty title="會刊編輯中">
          內容與影像確認後，將提供線上閱讀及 PDF。
        </Empty>
      )}
    </section>
  );
}
