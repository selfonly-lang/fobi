import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getCatalog } from "@/lib/catalog";
import { resolveSite } from "@/lib/site";
import { BrandHome } from "@/components/public";
export default async function Edition({
  params,
}: {
  params: Promise<{ year: string }>;
}) {
  const { year } = await params,
    site = await resolveSite((await headers()).get("host") || "");
  if (!site || site.kind !== "brand" || !/^\d{4}$/.test(year)) notFound();
  const data = await getCatalog(),
    brand = data.brands.find((b) => b.slug === site.slug),
    p = data.projects.find(
      (p) => p.brand_id === brand?.id && p.year === Number(year),
    );
  if (!p) notFound();
  return <BrandHome site={site} data={data} project={p} />;
}
