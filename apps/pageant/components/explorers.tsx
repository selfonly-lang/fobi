"use client";
import { useState } from "react";
import Link from "next/link";
import { Search, ArrowUpRight, CalendarDays, MapPin, Play } from "lucide-react";
import type { Article, Project, Activity, Media } from "@/lib/types";
import { statusLabel, money } from "@/lib/domain";
export function NewsExplorer({
  articles,
  projects,
}: {
  articles: Article[];
  projects: Project[];
}) {
  const [q, setQ] = useState(""),
    [tab, setTab] = useState("all");
  const tabs = [
    ["all", "全部報導"],
    ["people", "人物專訪"],
    ["brand", "品牌故事"],
    ["event", "賽事紀錄"],
  ];
  const rows = articles.filter((a) => {
    const c = a.content;
    const matches =
      tab === "all" ||
      (tab === "people" &&
        /人物|專訪|博士|教授|教練|執行長/.test(c.title + " " + c.topic)) ||
      (tab === "brand" && c.category === "合作夥伴專題") ||
      (tab === "event" && c.category === "賽事結案");
    return (
      matches &&
      (c.title + " " + c.partner + " " + c.topic)
        .toLowerCase()
        .includes(q.toLowerCase())
    );
  });
  return (
    <>
      <div className="explorer-controls">
        <div className="filter-tabs">
          {tabs.map(([id, label]) => (
            <button
              key={id}
              className={tab === id ? "active" : ""}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="search-box">
          <Search size={17} />
          <input
            aria-label="搜尋新聞"
            placeholder="搜尋人物、品牌與故事"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
      </div>
      <p className="result-count">{rows.length} 篇報導</p>
      <div className="story-grid news-grid">
        {rows.map((a) => {
          const c = a.content,
            p = projects.find((p) => p.id === a.project_id),
            href = (p?.domain || "") + "/news/" + a.slug;
          return (
            <article className="story-card" key={a.id}>
              <a href={href} className="story-photo">
                <img
                  src={c.photos[0]?.url}
                  alt={c.photos[0]?.caption || c.title}
                  width="900"
                  height="640"
                  loading="lazy"
                />
                <span className="image-chip">{c.topic || c.category}</span>
                <span className="photo-arrow">
                  <ArrowUpRight size={21} />
                </span>
              </a>
              <div className="story-meta">
                <span>{c.partner}</span>
                <span>{a.publish_at?.slice(0, 10)}</span>
              </div>
              <h3>
                <a href={href}>{c.title}</a>
              </h3>
              <p>{c.subtitle}</p>
            </article>
          );
        })}
      </div>
      {!rows.length && (
        <div className="empty-public">
          <h3>沒有符合條件的報導</h3>
          <p>換個關鍵字，探索更多故事。</p>
        </div>
      )}
    </>
  );
}
export function EventExplorer({
  projects,
  activities,
}: {
  projects: Project[];
  activities: Activity[];
}) {
  const [q, setQ] = useState(""),
    [tab, setTab] = useState("all");
  const rows = projects.filter(
    (p) =>
      (p.title + " " + p.summary).includes(q) &&
      (tab === "all" ||
        (tab === "planning" && p.status === "planning") ||
        (tab === "archived" && ["closed", "archived"].includes(p.status)) ||
        (tab === "upcoming" &&
          p.event_date &&
          new Date(p.event_date) > new Date() &&
          !["closed", "archived"].includes(p.status))),
  );
  const lessons = activities.filter(
    (a) =>
      (tab === "course"
        ? ["course", "training"].includes(a.kind)
        : tab === "upcoming"
          ? a.status === "open" &&
            a.starts_at &&
            Date.parse(a.starts_at) > Date.now()
          : tab === "all") && (a.title + " " + a.venue).includes(q),
  );
  return (
    <>
      <div className="explorer-controls">
        <div className="filter-tabs">
          {[
            ["all", "所有舞台"],
            ["upcoming", "近期活動"],
            ["course", "課程培訓"],
            ["planning", "籌備預告"],
            ["archived", "歷屆成果"],
          ].map(([id, label]) => (
            <button
              key={id}
              className={tab === id ? "active" : ""}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="search-box">
          <Search size={17} />
          <input
            aria-label="搜尋活動"
            placeholder="搜尋賽事、課程或地點"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
      </div>
      {tab !== "course" && (
        <div className="project-grid">
          {rows.map((p) => (
            <article className="project-card" key={p.id}>
              <a
                className={
                  "project-art " + (p.slug === "fobi-2026" ? "" : "taiwan-card")
                }
                href={"/events/" + p.slug}
              >
                {p.slug === "fobi-2026" ? (
                  <img
                    src="/editorial/event-records/upload-6dcce6b28b84.jpg"
                    alt="FOBI 2026 活動資料照"
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
                <span className="project-badge">{statusLabel[p.status]}</span>
              </a>
              <div className="project-copy">
                <span className="eyebrow">{p.year} · TAIWAN</span>
                <h3>
                  <Link href={"/events/" + p.slug}>{p.title}</Link>
                </h3>
                <p>{p.summary}</p>
                <div className="event-meta">
                  <CalendarDays size={15} />
                  {p.event_date || "日期確認後公告"}
                </div>
                <Link href={"/events/" + p.slug} className="text-link">
                  探索賽事 <ArrowUpRight size={15} />
                </Link>
                {p.official_ready ? (
                  <a href={p.domain} className="text-link">
                    官方網站 <ArrowUpRight size={15} />
                  </a>
                ) : (
                  <Link
                    href={
                      p.slug === "miss-taiwan-2027"
                        ? "/preview/miss-taiwan"
                        : "/events/" + p.slug
                    }
                    className="text-link"
                  >
                    官網預覽 <ArrowUpRight size={15} />
                  </Link>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
      <div className="activity-grid">
        {lessons.map((a) => (
          <Link
            key={a.id}
            href={"/activities/" + a.id}
            className="activity-card"
          >
            <span className="eyebrow">
              {{
                course: "COURSE",
                training: "TRAINING",
                press: "PRESS",
                final: "FINALE",
                segment: "COMPETITION",
              }[a.kind] || "EVENT"}
            </span>
            <h3>{a.title}</h3>
            <p>{a.description.slice(0, 110)}</p>
            <div className="event-meta">
              <CalendarDays size={15} />
              {a.starts_at
                ? new Date(a.starts_at).toLocaleDateString("zh-TW", {
                    timeZone: a.timezone,
                  })
                : "日期待公告"}
            </div>
            <div className="event-meta">
              <MapPin size={15} />
              {a.venue || "地點待公告"}
            </div>
            <div className="activity-bottom">
              <span>{a.amount ? money(a.amount) : "免費報名"}</span>
              <span>
                {statusLabel[a.status]} <ArrowUpRight size={15} />
              </span>
            </div>
          </Link>
        ))}
      </div>
      {(!rows.length || tab === "course") && !lessons.length && (
        <div className="empty-public">
          <h3>
            {tab === "course"
              ? "課程確認後將在這裡公告"
              : "目前沒有符合條件的活動"}
          </h3>
          <p>您也可以加入會員，建立自己的賽事或課程專案。</p>
          <Link href="/create" className="text-link">
            建立活動 <ArrowUpRight size={15} />
          </Link>
        </div>
      )}
    </>
  );
}
export function ShareTools({
  text,
  url,
  id,
  type = "article",
}: {
  text: string;
  url: string;
  id: string;
  type?: string;
}) {
  const [message, setMessage] = useState("");
  return (
    <div className="share-tools">
      <button
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(text + "\n\n" + url);
            setMessage("文字與連結已複製");
          } catch {
            setMessage("請選取內文複製");
          }
        }}
      >
        複製文字與連結
      </button>
      <button
        onClick={async () => {
          try {
            if (navigator.share)
              await navigator.share({ title: document.title, url });
            else await navigator.clipboard.writeText(url);
            setMessage("分享連結已準備");
          } catch {
            setMessage("您已取消分享");
          }
        }}
      >
        分享
      </button>
      <button
        onClick={async () => {
          const { api } = await import("@/lib/client-api");
          try {
            await api("bookmark", { id, type });
            setMessage("已加入收藏");
          } catch (e) {
            if ((e as { status?: number }).status === 401)
              location.href =
                "/login?returnTo=" + encodeURIComponent(location.pathname);
            else setMessage((e as Error).message);
          }
        }}
      >
        加入收藏
      </button>
      <span role="status">{message}</span>
    </div>
  );
}
export function PrintButton() {
  return (
    <button className="button outline" onClick={() => window.print()}>
      列印／另存 PDF
    </button>
  );
}
