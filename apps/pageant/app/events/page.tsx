import { headers } from "next/headers";
import type { Metadata } from "next";
import { getCatalog } from "@/lib/catalog";
import { resolveSite } from "@/lib/site";
import { EventExplorer } from "@/components/explorers";
export const metadata: Metadata = { title: "探索賽事、活動與培訓課程" };
export default async function Events() {
  const data = await getCatalog(),
    site = await resolveSite((await headers()).get("host") || "");
  const brand = data.brands.find((b) => b.slug === site?.slug),
    projects =
      site?.kind === "brand"
        ? data.projects.filter((p) => p.brand_id === brand?.id)
        : data.projects,
    ids = new Set(projects.map((p) => p.id));
  return (
    <section className="wrap section">
      <div className="page-intro">
        <span className="eyebrow">FIND YOUR NEXT STAGE</span>
        <h1>
          找到屬於你的
          <br />
          下一個舞台。
        </h1>
        <p>從賽事、培訓到每一場相遇，探索新的可能。</p>
      </div>
      <EventExplorer
        projects={projects}
        activities={data.activities.filter((a) => ids.has(a.project_id))}
      />
    </section>
  );
}
