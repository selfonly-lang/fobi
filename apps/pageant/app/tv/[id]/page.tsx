import { headers } from "next/headers";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCatalog } from "@/lib/catalog";
import { resolveSite } from "@/lib/site";
import { VideoPlayer } from "@/components/video-player";
import { ShareTools } from "@/components/explorers";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params,
    d = await getCatalog(),
    m = d.media.find((m) => m.id === id);
  return m
    ? { title: m.title, description: m.description }
    : { title: "影片尚未公開" };
}
export default async function Film({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params,
    d = await getCatalog(),
    m = d.media.find((m) => m.id === id),
    s = await resolveSite((await headers()).get("host") || "");
  if (!m) notFound();
  if (s?.kind === "brand") {
    const p = d.projects.find((p) => p.id === m.project_id),
      b = d.brands.find((b) => b.id === p?.brand_id);
    if (b?.slug !== s.slug) notFound();
  }
  return (
    <section className="wrap section film-detail">
      <span className="eyebrow">BEAUTYTV · THE OFFICIAL FILM</span>
      <h1>{m.title}</h1>
      <VideoPlayer media={m} />
      <p>{m.description}</p>
      <p className="video-source">
        {m.caption} ·{" "}
        <a href={m.source} target="_blank" rel="noopener">
          影片與素材來源 ↗
        </a>
      </p>
      <ShareTools
        id={m.id}
        type="media"
        text={m.title + "\n" + m.description}
        url={(s?.origin || "https://pageant.self.com.tw") + "/tv/" + m.id}
      />
    </section>
  );
}
