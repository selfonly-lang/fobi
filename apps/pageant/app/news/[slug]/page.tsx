import { headers } from "next/headers";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCatalog, officialArticle } from "@/lib/catalog";
import { resolveSite } from "@/lib/site";
import { ShareTools } from "@/components/explorers";
import { StoryCard } from "@/components/public";
async function getStory(slug: string) {
  const data = await getCatalog(),
    a = data.articles.find((a) => a.slug === slug),
    site = await resolveSite((await headers()).get("host") || "");
  if (!a) notFound();
  if (site?.kind === "brand") {
    const p = data.projects.find((p) => p.id === a.project_id),
      b = data.brands.find((b) => b.id === p?.brand_id);
    if (b?.slug !== site.slug) notFound();
  }
  return { data, a };
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params,
    { data, a } = await getStory(slug),
    c = a.content;
  return {
    title: c.title,
    description: c.subtitle,
    alternates: { canonical: officialArticle(a, data.projects) },
    openGraph: {
      type: "article",
      title: c.title,
      description: c.subtitle,
      publishedTime: a.publish_at,
      modifiedTime: a.updated_at,
      images: c.photos.map((p) => ({
        url: p.url.startsWith("/") ? "https://fobi.self.com.tw" + p.url : p.url,
      })),
    },
  };
}
export default async function Article({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params,
    { data, a } = await getStory(slug),
    c = a.content;
  const photo = (i: number) => {
    const p = c.photos[i];
    return p ? (
      <figure key={i}>
        <img
          src={p.url}
          alt={p.caption}
          width="1200"
          height="800"
          loading={i ? "lazy" : "eager"}
        />
        <figcaption>
          {p.caption}{" "}
          {p.source && (
            <a href={p.source} target="_blank" rel="noopener">
              圖片來源 ↗
            </a>
          )}
        </figcaption>
      </figure>
    ) : null;
  };
  const text = [
    c.title,
    c.subtitle,
    c.byline,
    ...(c.facts || []),
    ...(c.perspective || []),
    ...c.sections.flatMap((s) => [s.heading, ...s.paragraphs]),
    ...(c.closing || []),
  ]
    .filter(Boolean)
    .join("\n\n");
  const schema = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: c.title,
    description: c.subtitle,
    datePublished: a.publish_at,
    dateModified: a.updated_at,
    image: c.photos.map((p) =>
      p.url.startsWith("/") ? "https://fobi.self.com.tw" + p.url : p.url,
    ),
    author: {
      "@type": "Organization",
      name: c.byline || "SELF PAGEANT 編輯室",
    },
    mainEntityOfPage: officialArticle(a, data.projects),
  };
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(schema).replaceAll("<", "\\u003c"),
        }}
      />
      <header className="article-heading wrap">
        <a className="eyebrow" href="/news">
          THE PAGEANT JOURNAL / {c.category}
        </a>
        <h1>{c.title}</h1>
        <p className="article-subtitle">{c.subtitle}</p>
        <div className="article-byline">
          <span>{c.byline || "SELF PAGEANT 編輯室"}</span>
          <span>{a.publish_at?.slice(0, 10)}</span>
          <span>{c.partner}</span>
        </div>
      </header>
      <article className="article-body">
        {photo(0)}
        {c.facts?.map((p, i) => (
          <p key={"f" + i}>{p}</p>
        ))}
        {c.perspective?.map((p, i) => (
          <p key={"p" + i}>{p}</p>
        ))}
        {c.sections.map((s, i) => (
          <div key={i}>
            <section>
              <h2>{s.heading}</h2>
              {s.paragraphs.map((p, j) => (
                <p key={j}>{p}</p>
              ))}
            </section>
            {i === 1 && photo(1)}
            {i === 4 && photo(2)}
          </div>
        ))}
        {c.sections.length < 2 && photo(1)}
        {c.sections.length < 5 && photo(2)}
        {c.photos.slice(3).map((_, i) => photo(i + 3))}
        {c.closing?.map((p, i) => (
          <p key={"c" + i}>{p}</p>
        ))}
        <aside className="article-sources">
          <h3>資料與圖片來源</h3>
          <ul>
            {c.sources.map((s, i) => (
              <li key={i}>
                <a href={s.url} target="_blank" rel="noopener">
                  {s.title} ↗
                </a>
              </li>
            ))}
          </ul>
        </aside>
        <ShareTools
          id={a.id}
          text={text}
          url={officialArticle(a, data.projects)}
        />
      </article>
      <section className="wrap section related-stories">
        <div className="section-title">
          <div>
            <span className="eyebrow">KEEP READING</span>
            <h2>還有更多故事。</h2>
          </div>
        </div>
        <div className="story-grid">
          {data.articles
            .filter((x) => x.id !== a.id && x.project_id === a.project_id)
            .slice(0, 3)
            .map((x) => (
              <StoryCard key={x.id} article={x} projects={data.projects} />
            ))}
        </div>
      </section>
    </>
  );
}
