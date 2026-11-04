import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, CalendarDays, MapPin } from "lucide-react";
import { getCatalog, defaultCover } from "@/lib/catalog";
import { statusLabel, money } from "@/lib/domain";
import { StoryCard, SectionTitle, Empty } from "@/components/public";
import { ShareTools } from "@/components/explorers";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params,
    d = await getCatalog(),
    p = d.projects.find((p) => p.slug === slug);
  return p
    ? {
        title: p.title,
        description: p.summary,
        alternates: {
          canonical: "https://pageant.self.com.tw/events/" + p.slug,
        },
      }
    : { title: "活動未公開" };
}
export default async function Event({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params,
    data = await getCatalog(),
    p = data.projects.find((p) => p.slug === slug);
  if (!p) notFound();
  const contestants = (data.contestants || []).filter(
      (c) => c.project_id === p.id,
    ),
    results = (data.results || []).filter((r) => r.project_id === p.id);
  const fobi = p.slug === "fobi-2026",
    articles = data.articles.filter((a) => a.project_id === p.id),
    activities = data.activities.filter((a) => a.project_id === p.id);
  return (
    <>
      <section
        className={"event-detail-hero " + (fobi ? "" : "planning-event")}
      >
        <div className="wrap">
          <div>
            <span className="eyebrow">
              {fobi
                ? "OFFICIAL PROJECT · THE ARCHIVE"
                : "OFFICIAL PROJECT · IN PREPARATION"}
            </span>
            <h1>{p.title}</h1>
            <p>{p.summary}</p>
            <span className="status-pill">{statusLabel[p.status]}</span>
            <div className="event-detail-info">
              <span>
                <CalendarDays size={16} />
                {p.event_date || "正式日期確認後公告"}
              </span>
              <span>
                <MapPin size={16} />
                {p.venue || "場地確認後公告"}
              </span>
            </div>
            <a
              href={
                p.official_ready
                  ? p.domain
                  : p.slug === "miss-taiwan-2027"
                    ? "/preview/miss-taiwan"
                    : "#programme"
              }
              className="button dark"
            >
              {p.official_ready ? "前往賽事官方網站" : "預覽籌備中的官網"}{" "}
              <ArrowUpRight size={17} />
            </a>
          </div>
          {fobi ? (
            <img
              src={defaultCover}
              alt="FOBI活動資料照"
              width="1280"
              height="960"
            />
          ) : (
            <div className="taiwan-word-art">
              <span>
                {p.slug === "miss-taiwan-2027" ? (
                  <>
                    MISS
                    <br />
                    <i>TAIWAN</i>
                  </>
                ) : (
                  <>
                    BEAUTY
                    <br />
                    <i>ON STAGE</i>
                  </>
                )}
              </span>
              <b>{p.year}</b>
            </div>
          )}
        </div>
      </section>
      <section id="programme" className="wrap section">
        <SectionTitle
          kicker="THE PROGRAMME"
          title={
            fobi ? "賽事已結束，精彩持續保存。" : "活動資訊，確認後陸續公告。"
          }
        />
        {activities.length ? (
          <div className="activity-grid">
            {activities.map((a) => (
              <Link
                className="activity-card"
                key={a.id}
                href={"/activities/" + a.id}
              >
                <span className="eyebrow">{statusLabel[a.status]}</span>
                <h3>{a.title}</h3>
                <p>{a.description}</p>
                <div className="activity-bottom">
                  <span>
                    {a.starts_at
                      ? new Date(a.starts_at).toLocaleDateString("zh-TW")
                      : "日期待公告"}
                  </span>
                  <span>{a.amount ? money(a.amount) : "免費報名"}</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <Empty
            title={
              fobi
                ? "本屆已結案，目前沒有開放報名或售票的活動。"
                : "目前為籌備階段，尚未開放報名與售票。"
            }
          >
            {fobi
              ? "您可閱讀官方新聞、活動紀錄與結案會刊。"
              : "正式日期、場地及招募資訊將在主辦確認後公告。"}
          </Empty>
        )}
      </section>
      {articles.length > 0 && (
        <section className="wrap section">
          <SectionTitle
            kicker="STORIES FROM THE STAGE"
            title="來自這個舞台的故事"
            href={p.domain + "/news"}
          />
          <div className="story-grid">
            {articles.slice(0, 6).map((a) => (
              <StoryCard key={a.id} article={a} projects={data.projects} />
            ))}
          </div>
        </section>
      )}
      <section className="wrap">
        {contestants.length > 0 && (
          <>
            <SectionTitle
              kicker="THE PEOPLE ON STAGE"
              title="每一份風采，都值得被看見。"
            />
            <div className="story-grid">
              {contestants.map((c) => (
                <article className="story-card" key={c.id}>
                  {c.photo && <img src={c.photo} alt={c.name} loading="lazy" />}
                  <h3>{c.name}</h3>
                  <span className="eyebrow">{c.country}</span>
                  <p>{c.bio}</p>
                </article>
              ))}
            </div>
          </>
        )}
        {results.map((r) => (
          <section className="panel" key={r.activity_id}>
            <h2>{r.snapshot.title} · 正式成績</h2>
            {r.snapshot.results.map((x: Record<string, any>) => (
              <div className="list-row" key={x.contestant_id}>
                <b>
                  {x.rank} · {x.name}
                </b>
                <span>{x.country}</span>
                <span>{x.total} 分</span>
              </div>
            ))}
          </section>
        ))}
      </section>
      <div className="wrap">
        <ShareTools
          id={p.id}
          type="project"
          text={p.title + "\n" + p.summary}
          url={"https://pageant.self.com.tw/events/" + p.slug}
        />
      </div>
    </>
  );
}
