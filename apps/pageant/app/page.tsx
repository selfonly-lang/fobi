import {taiwanMetadata} from "@/lib/website";
import { MissTaiwanHome } from "@/components/miss-taiwan";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCatalog, defaultCover } from "@/lib/catalog";
import { resolveSite } from "@/lib/site";
import { MagazineHome, BrandHome } from "@/components/public";
export async function generateMetadata(): Promise<Metadata> {
  const site = await resolveSite((await headers()).get("host") || "");
  if (!site) return {};
  if(site.slug === "miss-taiwan")return taiwanMetadata();
  return {
    title:
      site.kind === "platform"
        ? "SELF PAGEANT｜全球選美・時尚・人物・活動平台"
        : site.name + "官方網站",
    alternates: { canonical: site.origin },
    openGraph: {
      title:
        site.kind === "platform"
          ? "SELF PAGEANT｜讓美，走向世界"
          : site.name + "官方網站",
      url: site.origin,
      ...(site.slug === "miss-taiwan"
        ? {
            images: [
              {
                url: "https://pageant.self.com.tw/miss-taiwan-2027/campaign.webp",
                alt: "AI 招募形象示意，非本屆參賽者",
              },
            ],
          }
        : {}),
    },
  };
}
export default async function Home() {
  const site = await resolveSite((await headers()).get("host") || "");
  if (!site) notFound();
  const data = await getCatalog();
  if (site.kind === "platform") return <MagazineHome data={data} />;
  const brand = data.brands.find((b) => b.slug === site.slug),
    project = data.projects.find((p) => p.id === brand?.primary_project_id);
  if (!project) notFound();
  return site.slug === "miss-taiwan" && project.year === 2027 ? (
    <MissTaiwanHome data={data} project={project} />
  ) : (
    <BrandHome data={data} site={site} project={project} />
  );
}
