import { headers } from "next/headers";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCatalog } from "@/lib/catalog";
import { resolveSite } from "@/lib/site";
import { PrintButton } from "@/components/explorers";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params,
    d = await getCatalog(),
    p = d.publications.find((p) => p.slug === slug);
  return p
    ? { title: p.publication.title, description: p.publication.description }
    : { title: "會刊尚未公開" };
}
export default async function Reader({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params,
    d = await getCatalog(),
    book = d.publications.find((p) => p.slug === slug),
    s = await resolveSite((await headers()).get("host") || "");
  if (!book) notFound();
  if (s?.kind === "brand") {
    const p = d.projects.find((p) => p.id === book.project_id),
      b = d.brands.find((b) => b.id === p?.brand_id);
    if (b?.slug !== s.slug) notFound();
  }
  const p = book.publication;
  return (
    <article className="publication-reader">
      <header>
        <span className="eyebrow">
          SELF PAGEANT · OFFICIAL PUBLICATION · VOL. {p.version}
        </span>
        <h1>{p.title}</h1>
        <p className="lead">{p.description}</p>
        <div className="reader-actions">
          <a
            className="button dark"
            href={"/api/publications/" + book.id + "/pdf"}
            download
          >
            下載 PDF ↧
          </a>
          <PrintButton />
        </div>
      </header>
      <nav className="publication-toc" aria-label="會刊目錄">
        <span className="eyebrow">CONTENTS</span>
        {p.chapters.map((c, i) => (
          <a key={i} href={"#chapter-" + i}>
            {String(i + 1).padStart(2, "0")}　{c.heading}
          </a>
        ))}
      </nav>
      {p.chapters.map((c, i) => (
        <section className="publication-chapter" id={"chapter-" + i} key={i}>
          <span className="eyebrow">
            CHAPTER {String(i + 1).padStart(2, "0")}
          </span>
          <h2>{c.heading}</h2>
          {c.photo && (
            <figure>
              <img
                src={c.photo}
                alt={c.caption || c.heading}
                width="1200"
                height="800"
                loading="lazy"
              />
              {c.caption && <figcaption>{c.caption}</figcaption>}
            </figure>
          )}
          {c.paragraphs.map((p, j) => (
            <p key={j}>{p}</p>
          ))}
        </section>
      ))}
    </article>
  );
}
