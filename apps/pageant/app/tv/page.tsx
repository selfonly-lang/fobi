import { headers } from "next/headers";
import type { Metadata } from "next";
import { getCatalog } from "@/lib/catalog";
import { resolveSite } from "@/lib/site";
import { FilmCard, Empty } from "@/components/public";
export const metadata: Metadata = { title: "BeautyTV・選美短影音與人物影像" };
export default async function TV() {
  const d = await getCatalog(),
    s = await resolveSite((await headers()).get("host") || ""),
    b = d.brands.find((b) => b.slug === s?.slug),
    ids = new Set(
      d.projects.filter((p) => p.brand_id === b?.id).map((p) => p.id),
    ),
    media =
      s?.kind === "brand"
        ? d.media.filter((m) => m.project_id && ids.has(m.project_id))
        : d.media;
  return (
    <section className="wrap section">
      <div className="page-intro">
        <span className="eyebrow">BEAUTY IN MOTION</span>
        <h1>
          光影之間，
          <br />
          每一刻都精彩。
        </h1>
        <p>賽事回顧、人物訪談與佳麗風采，歡迎來到 BeautyTV。</p>
      </div>
      {media.length ? (
        <div className="film-grid">
          {media.map((m) => (
            <FilmCard key={m.id} media={m} />
          ))}
        </div>
      ) : (
        <Empty title="影像整理中">授權並確認完成的影片將在此公開。</Empty>
      )}
    </section>
  );
}
