import { notFound } from "next/navigation";
import { getCatalog } from "@/lib/catalog";
import { resolveSite } from "@/lib/site";
import { BrandHome } from "@/components/public";
export const metadata = {
  title: "賽事官網預覽",
  robots: { index: false, follow: false },
};
export default async function Preview({
  params,
}: {
  params: Promise<{ brand: string }>;
}) {
  const { brand } = await params,
    d = await getCatalog(),
    b = d.brands.find((b) => b.slug === brand),
    p = d.projects.find((p) => p.id === b?.primary_project_id);
  if (!b || !p) notFound();
  const s = await resolveSite(b.domain);
  if (!s) notFound();
  return (
    <>
      <div className="notice" style={{ margin: 0, textAlign: "center" }}>
        賽事官網預覽 · 正式網址 {b.domain}{" "}
        {b.domain_status === "verified" ? "已啟用" : "設定中"}
      </div>
      <BrandHome data={d} site={s} project={p} />
    </>
  );
}
