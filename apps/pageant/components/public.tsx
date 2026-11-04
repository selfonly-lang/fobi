import Link from "next/link";
import {
  ArrowUpRight,
  ArrowRight,
  Play,
  CalendarDays,
  MapPin,
} from "lucide-react";
import type {
  Article,
  Catalog,
  Project,
  Site,
  Media,
  Publication,
} from "@/lib/types";
import { officialArticle, defaultCover } from "@/lib/catalog";
import { PLATFORM, statusLabel, money } from "@/lib/domain";
import { Reveal } from "./motion";
export function SectionTitle({
  kicker,
  title,
  href,
  label = "探索更多",
}: {
  kicker: string;
  title: string;
  href?: string;
  label?: string;
}) {
  return (
    <div className="section-title">
      <div>
        <span className="eyebrow">{kicker}</span>
        <h2>{title}</h2>
      </div>
      {href && (
        <Link className="text-link" href={href}>
          {label} <ArrowUpRight size={15} />
        </Link>
      )}
    </div>
  );
}
export function StoryCard({
  article,
  projects,
  large = false,
}: {
  article: Article;
  projects: Project[];
  large?: boolean;
}) {
  const c = article.content;
  return (
    <article className={"story-card " + (large ? "large" : "")}>
      <a href={officialArticle(article, projects)} className="story-photo">
        <img
          src={c.photos[0]?.url || defaultCover}
          alt={c.photos[0]?.caption || c.title}
          loading="lazy"
          width="900"
          height="640"
        />
        <span className="image-chip">
          {c.topic || c.category || "PAGEANT JOURNAL"}
        </span>
        <span className="photo-arrow">
          <ArrowUpRight size={21} />
        </span>
      </a>
      <div className="story-meta">
        <span>{c.partner || "SELF PAGEANT"}</span>
        <span>{article.publish_at?.slice(0, 10).replaceAll("-", ".")} </span>
      </div>
      <h3>
        <a href={officialArticle(article, projects)}>{c.title}</a>
      </h3>
      {large && <p>{c.subtitle}</p>}
    </article>
  );
}
export function ProjectCard({ project }: { project: Project }) {
  const fobi = project.slug === "fobi-2026";
  return (
    <article className={"project-card " + (fobi ? "fobi-card" : "taiwan-card")}>
      <a
        href={project.domain || "/events/" + project.slug}
        className="project-art"
      >
        {fobi ? (
          <img
            src={defaultCover}
            alt="FOBI 世界美顏小姐活動資料照"
            loading="lazy"
            width="1280"
            height="960"
          />
        ) : (
          <div className="taiwan-word-art">
            <span>
              {project.slug === "miss-taiwan-2027" ? (
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
            <b>{project.year}</b>
          </div>
        )}
        <span className="project-badge">
          {statusLabel[project.status] || project.status}
        </span>
        <span className="project-visit">
          <ArrowUpRight size={22} />
        </span>
      </a>
      <div className="project-copy">
        <span className="eyebrow">
          {fobi
            ? "FACE OF BEAUTY INTERNATIONAL"
            : project.slug === "miss-taiwan-2027"
              ? "MISS TAIWAN"
              : "SELF PAGEANT"}
        </span>
        <h3>{project.title}</h3>
        <p>{project.summary}</p>
        <a className="text-link" href={"/events/" + project.slug}>
          專案介紹 <ArrowRight size={14} />
        </a>
        {project.official_ready ? (
          <a className="text-link" href={project.domain}>
            賽事官網 <ArrowUpRight size={14} />
          </a>
        ) : (
          <Link
            className="text-link"
            href={
              project.slug === "miss-taiwan-2027"
                ? "/preview/miss-taiwan"
                : "/events/" + project.slug
            }
          >
            官網預覽 <ArrowUpRight size={14} />
          </Link>
        )}
      </div>
    </article>
  );
}
export function FilmCard({ media }: { media: Media }) {
  return (
    <article className="film-card">
      <Link href={"/tv/" + media.id}>
        <div className="film-poster">
          <img
            src={media.poster || defaultCover}
            alt={media.caption || media.title}
            width="900"
            height="560"
            loading="lazy"
          />
          <span className="play">
            <Play size={22} fill="currentColor" />
          </span>
        </div>
        <div className="story-meta">
          <span>
            {{
              short: "SHORT FILM",
              interview: "IN CONVERSATION",
              highlight: "EVENT DIARY",
              show: "BEAUTYTV",
            }[media.kind] || "BEAUTYTV"}
          </span>
        </div>
        <h3>{media.title}</h3>
      </Link>
    </article>
  );
}
export function BookCard({ publication }: { publication: Publication }) {
  const p = publication.publication;
  return (
    <Link className="book-card" href={"/publications/" + publication.slug}>
      <div className="book-cover">
        <small>SELF PAGEANT · SPECIAL EDITION</small>
        <div>
          <span>
            BEAUTY
            <br />
            IN EVERY
            <br />
            <i>CHAPTER.</i>
          </span>
        </div>
        <b>{p.title}</b>
        <small>
          VOL. {String(p.version).padStart(2, "0")} <ArrowUpRight size={18} />
        </small>
      </div>
      <h3>{p.title}</h3>
      <p>{p.description}</p>
    </Link>
  );
}
export function Empty({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="empty-public">
      <span className="eyebrow">COMING INTO FOCUS</span>
      <h3>{title}</h3>
      {children && <p>{children}</p>}
    </div>
  );
}
export function MagazineHome({ data }: { data: Catalog }) {
  const feature =
    data.articles.find((a) => a.id === data.home?.feature_article_id) ||
    data.articles.find((a) => a.slug === "medical-media-mao-fobi-2026") ||
    data.articles[0];
  const lead =
    data.articles.find((a) => a.id === data.home?.hero_article_id) ||
    data.articles.find((a) => a.slug === "fobi-2026-finale") ||
    data.articles[0];
  const stories = data.articles
    .filter((a) => a.id !== feature?.id && a.id !== lead?.id)
    .slice(0, 3);
  const upcoming = data.activities.filter(
    (a) =>
      a.status === "open" &&
      a.starts_at &&
      Date.parse(a.starts_at) > Date.now(),
  );
  return (
    <>
      <section className="editorial-hero wrap">
        <div className="hero-intro">
          <Reveal>
            <div className="issue-line">
              <span>THE PAGEANT JOURNAL</span>
              <span>TAIWAN & BEYOND</span>
            </div>
            <h1>
              讓美，
              <br />
              走向<span className="serif-em">世界。</span>
            </h1>
            <p>
              從國際舞台，到每一個值得被看見的故事。
              <br />
              在這裡，遇見選美、時尚與女性的更多可能。
            </p>
            <div className="hero-actions">
              <Link href="/news" className="button dark">
                閱讀選美誌 <ArrowUpRight size={16} />
              </Link>
              <Link href="/events" className="text-link">
                探索賽事 <ArrowRight size={15} />
              </Link>
            </div>
            <div className="hero-note">
              <span className="tiny-line" />
              BEAUTY CONNECTS US ALL.
            </div>
          </Reveal>
        </div>
        <Reveal className="hero-image" delay={0.12}>
          <img
            src={defaultCover}
            alt="FOBI 世界美顏小姐佳麗活動合影，活動方提供"
            width="1280"
            height="960"
            fetchPriority="high"
          />
          <div className="hero-image-caption">
            <span>THE INTERNATIONAL EDITION</span>
            <a href="https://fobi.self.com.tw">
              FOBI 2026 · 世界美顏小姐 <ArrowUpRight size={17} />
            </a>
          </div>
        </Reveal>
        <div className="hero-edge">MORE THAN A CROWN. A WORLD OF STORIES.</div>
      </section>
      <div className="editorial-strip">
        <div className="wrap">
          <span>GLOBAL PAGEANTS</span>
          <i>✦</i>
          <span>FASHION & CULTURE</span>
          <i>✦</i>
          <span>WOMEN WITH A VOICE</span>
          <i>✦</i>
          <span>TAIWAN TO THE WORLD</span>
        </div>
      </div>
      <section className="wrap section">
        <SectionTitle
          kicker="THE EDITOR’S SELECTION"
          title="舞台之外，故事正在發生。"
          href="/news"
          label="所有報導"
        />
        <div className="editor-grid">
          {lead && (
            <Reveal>
              <StoryCard article={lead} projects={data.projects} large />
            </Reveal>
          )}
          <div className="editor-side">
            {stories.map((a, i) => (
              <Reveal key={a.id} delay={i * 0.06}>
                <article className="compact-story">
                  <a href={officialArticle(a, data.projects)}>
                    <img
                      src={a.content.photos[0]?.url || defaultCover}
                      alt={a.content.photos[0]?.caption || a.content.title}
                      loading="lazy"
                      width="300"
                      height="240"
                    />
                  </a>
                  <div>
                    <span className="eyebrow">
                      {a.content.topic || "BRAND STORY"}
                    </span>
                    <h3>
                      <a href={officialArticle(a, data.projects)}>
                        {a.content.title}
                      </a>
                    </h3>
                    <span className="small-date">
                      {a.publish_at?.slice(0, 10)}
                    </span>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
      {feature && (
        <section className="portrait-band">
          <div className="wrap portrait-layout">
            <Reveal className="portrait-image">
              <img
                src={feature.content.photos[0]?.url || defaultCover}
                alt={
                  feature.content.photos[0]?.caption || feature.content.title
                }
                loading="lazy"
                width="900"
                height="1200"
              />
            </Reveal>
            <Reveal className="portrait-copy">
              <span className="eyebrow">IN CONVERSATION · 人物誌</span>
              <div className="big-quote">“</div>
              <h2>{feature.content.title.split("｜")[0]}</h2>
              <p>{feature.content.subtitle}</p>
              <a
                href={officialArticle(feature, data.projects)}
                className="button light-outline"
              >
                閱讀人物故事 <ArrowUpRight size={16} />
              </a>
              <span className="portrait-mark">
                HER STORY,
                <br />
                <i>HER WORLD.</i>
              </span>
            </Reveal>
          </div>
        </section>
      )}
      <section className="wrap section">
        <SectionTitle
          kicker="ON THE GLOBAL STAGE"
          title="每一個舞台，都有自己的光。"
          href="/events"
          label="探索活動與課程"
        />
        <div className="project-grid">
          {data.projects.slice(0, 2).map((p) => (
            <Reveal key={p.id}>
              <ProjectCard project={p} />
            </Reveal>
          ))}
        </div>
        {upcoming.length > 0 && (
          <div className="upcoming-list">
            {upcoming.slice(0, 3).map((a) => (
              <Link href={"/activities/" + a.id} key={a.id}>
                <CalendarDays size={18} />
                <span>
                  {new Date(a.starts_at!).toLocaleDateString("zh-TW", {
                    timeZone: a.timezone,
                  })}
                </span>
                <b>{a.title}</b>
                <span>{a.amount ? money(a.amount) : "免費報名"}</span>
                <ArrowUpRight size={18} />
              </Link>
            ))}
          </div>
        )}
      </section>
      {data.media.length > 0 && (
        <section className="film-section">
          <div className="wrap section">
            <SectionTitle
              kicker="MOTION, MOMENTS & MEMORIES"
              title="BeautyTV，把風采留在鏡頭裡。"
              href="/tv"
              label="觀看全部"
            />
            <div className="film-grid">
              {data.media.slice(0, 3).map((m) => (
                <FilmCard key={m.id} media={m} />
              ))}
            </div>
          </div>
        </section>
      )}
      {data.publications.length > 0 && (
        <section className="wrap section">
          <SectionTitle
            kicker="THE COLLECTOR’S EDITION"
            title="值得收藏的每一頁。"
            href="/publications"
            label="電子會刊"
          />
          <div className="publication-feature">
            <BookCard publication={data.publications[0]} />
            <div>
              <span className="eyebrow">FROM THE STAGE TO THE PAGE</span>
              <h2>
                將一場盛會，
                <br />
                留下完整的篇章。
              </h2>
              <p>
                人物、影像、品牌與幕後故事，收錄成可以閱讀、分享與保存的電子會刊。
              </p>
              <Link
                href={"/publications/" + data.publications[0].slug}
                className="text-link"
              >
                翻開本期 <ArrowUpRight size={17} />
              </Link>
            </div>
          </div>
        </section>
      )}
      <section className="create-band">
        <div className="wrap">
          <span className="eyebrow">YOUR NEXT STAGE STARTS HERE</span>
          <h2>
            下一個被世界看見的舞台，
            <br />
            <i>由你開始。</i>
          </h2>
          <p>
            從企劃、招募、培訓到售票、贊助與媒體，
            <br />
            讓你的每一個想法，有一個完整的起點。
          </p>
          <Link href="/create" className="button dark">
            建立我的活動 <ArrowUpRight size={17} />
          </Link>
        </div>
        <div className="create-watermark">STAGE</div>
      </section>
    </>
  );
}
export function BrandHome({
  data,
  site,
  project,
}: {
  data: Catalog;
  site: Site;
  project: Project;
}) {
  const fobi = site.slug === "fobi";
  const articles = data.articles.filter((a) => a.project_id === project.id),
    films = data.media.filter((m) => m.project_id === project.id),
    books = data.publications.filter((b) => b.project_id === project.id);
  const partners = articles.filter(
    (a) => a.content.category === "合作夥伴專題",
  );
  return (
    <>
      <section className={"brand-hero " + (fobi ? "fobi-hero" : "miss-hero")}>
        <div className="brand-hero-art">
          {fobi ? (
            <img
              src={defaultCover}
              alt="FOBI 2026 世界美顏小姐活動資料照"
              width="1280"
              height="960"
              fetchPriority="high"
            />
          ) : (
            <div className="miss-background">
              <span>
                {site.slug === "miss-taiwan" ? (
                  <>
                    MISS
                    <br />
                    <i>TAIWAN</i>
                  </>
                ) : (
                  site.wordmark
                )}
              </span>
              <b>{project.year}</b>
            </div>
          )}
        </div>
        <div className="wrap brand-hero-content">
          <span className="eyebrow">
            {fobi
              ? "THE OFFICIAL ARCHIVE · TAIWAN 2026"
              : "A NEW CHAPTER · " + project.year}
          </span>
          <h1>
            {fobi ? (
              <>
                美，讓世界
                <br />
                在台灣相遇。
              </>
            ) : (
              <>
                世界的舞台，
                <br />
                台灣的光。
              </>
            )}
          </h1>
          <p>{project.title}</p>
          <div className="brand-status">
            <span>{statusLabel[project.status]}</span>
            {project.event_date && (
              <span>
                {project.event_date} · {project.venue}
              </span>
            )}
          </div>
          <div className="hero-actions">
            {fobi ? (
              <>
                <a href="#stories" className="button white">
                  閱讀結案報導 <ArrowUpRight size={16} />
                </a>
                <a href="/Fobi/records" className="text-link">
                  活動影像 <ArrowRight size={15} />
                </a>
              </>
            ) : (
              <>
                <a href="#about" className="button dark">
                  認識籌備專案 <ArrowDownIcon />
                </a>
                <a
                  href={
                    site.slug === "miss-taiwan"
                      ? "https://www.facebook.com/share/1DhLQ1wH9B/?mibextid=wwXIfr"
                      : PLATFORM + "/events/" + project.slug
                  }
                  target="_blank"
                  rel="noopener"
                  className="text-link"
                >
                  賽事活動資訊 <ArrowUpRight size={15} />
                </a>
              </>
            )}
          </div>
        </div>
      </section>
      <section id="about" className="wrap section brand-intro">
        <div>
          <span className="eyebrow">
            {fobi
              ? "BEAUTY CONNECTS THE WORLD"
              : "BEAUTY, CONFIDENCE & POSSIBILITIES"}
          </span>
          <h2>
            {fobi ? (
              <>
                從一場國際盛會，
                <br />
                看見台灣的美好。
              </>
            ) : (
              <>
                每一份自信，
                <br />
                都值得被看見。
              </>
            )}
          </h2>
        </div>
        <div>
          <p>{project.summary}</p>
          {fobi ? (
            <p>
              官方網站保存本屆賽事新聞、人物與品牌專題、活動實拍及媒體結案。從舞台上的風采，到每一份支持的故事，都在這裡留下紀錄。
            </p>
          ) : (
            <p>
              本專案正在整理賽事企劃、招募、培訓、品牌合作與媒體計畫。正式日期、場地、資格及報名方式確認後，將於本網站公告。
            </p>
          )}
          <div className="brand-info-row">
            <span>
              年度 <b>{project.year}</b>
            </span>
            <span>
              狀態 <b>{statusLabel[project.status]}</b>
            </span>
            <a href={PLATFORM + "/events/" + project.slug}>
              平台專案介紹 <ArrowUpRight size={14} />
            </a>
          </div>
        </div>
      </section>
      {articles.length > 0 && (
        <section id="stories" className="wrap section">
          <SectionTitle
            kicker="THE OFFICIAL JOURNAL"
            title="讓故事，繼續發光。"
            href="/news"
            label="全部官方新聞"
          />
          <div className="story-grid">
            {articles.slice(0, 3).map((a) => (
              <StoryCard key={a.id} article={a} projects={data.projects} />
            ))}
          </div>
        </section>
      )}
      {films.length > 0 && (
        <section className="film-section">
          <div className="wrap section">
            <SectionTitle
              kicker="BEAUTY IN MOTION"
              title="把風采，留在鏡頭裡。"
              href="/tv"
            />
            <div className="film-grid">
              {films.map((m) => (
                <FilmCard key={m.id} media={m} />
              ))}
            </div>
          </div>
        </section>
      )}
      <section id="partners" className="wrap section">
        <SectionTitle
          kicker="TOGETHER, WE MAKE IT HAPPEN"
          title={
            fobi ? "每一份支持，都有自己的故事。" : "攜手，走向更大的舞台。"
          }
        />
        {partners.length ? (
          <div className="partner-list">
            {partners.map((a) => (
              <a key={a.id} href={officialArticle(a, data.projects)}>
                <b>{a.content.partner}</b>
                <span>
                  {a.content.topic || "品牌故事"} <ArrowUpRight size={14} />
                </span>
              </a>
            ))}
          </div>
        ) : (
          <div className="brand-partner-callout">
            <p>品牌合作、人才培育、媒體與國際交流，歡迎共同規劃。</p>
            <a href={PLATFORM + "/create"} className="button outline">
              前往平台提出合作 <ArrowUpRight size={15} />
            </a>
          </div>
        )}
      </section>
      <section id="archive" className="archive-section">
        <div className="wrap section">
          <SectionTitle
            kicker={fobi ? "THE OFFICIAL CLOSEOUT" : "THE NEXT CHAPTER"}
            title={fobi ? "盛會落幕，影響力持續。" : "記錄，從籌備開始。"}
          />
          {fobi ? (
            <>
              <div className="archive-links">
                <a href="/news">
                  <strong>{articles.length}</strong>
                  <span>官方新聞與品牌專題</span>
                  <ArrowUpRight size={18} />
                </a>
                <a href="/Fobi/records">
                  <strong>PHOTO</strong>
                  <span>活動影像與原始來源</span>
                  <ArrowUpRight size={18} />
                </a>
                <a href="/news/downloads/">
                  <strong>REPORT</strong>
                  <span>結案文稿與圖文書下載</span>
                  <ArrowUpRight size={18} />
                </a>
              </div>
              {books.length > 0 && (
                <div className="publication-feature">
                  <BookCard publication={books[0]} />
                  <div>
                    <span className="eyebrow">OFFICIAL PUBLICATION</span>
                    <h2>
                      以一份會刊，
                      <br />
                      珍藏每一個故事。
                    </h2>
                    <p>彙整已公開的賽事與品牌報導，提供線上閱讀及 PDF 保存。</p>
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="lead narrow">
              賽事確認後，將逐步公開招募、課程、賽程與合作資訊。此階段尚未開放報名或售票。
            </p>
          )}
        </div>
      </section>
    </>
  );
}
function ArrowDownIcon() {
  return <ArrowRight size={16} style={{ transform: "rotate(90deg)" }} />;
}
export function Footer({ site }: { site: Site }) {
  return (
    <footer className="site-footer">
      <div className="wrap">
        <div className="footer-top">
          <div>
            <a
              className="footer-brand"
              href={site.kind === "brand" ? site.origin : PLATFORM}
            >
              {site.wordmark}
            </a>
            <p>每一個舞台，都有值得被看見的故事。</p>
          </div>
          <div className="footer-links">
            <a href={PLATFORM + "/events"}>賽事與課程</a>
            <a href={PLATFORM + "/create"}>主辦與品牌合作</a>
            <a href={PLATFORM + "/account"}>會員中心</a>
            <a href={PLATFORM + "/studio"}>活動工作室</a>
          </div>
          <div className="footer-contact">
            <b>醫見傳媒有限公司</b>
            <span>Arthur Lin</span>
            <a href="tel:+886935523001">0935-523-001</a>
            <span>LINE ID · beautiself</span>
          </div>
        </div>
        <div className="footer-personal">
          <a href="https://she.self.com.tw/line-connect/">個人 LINE ↗</a>
          <a href="https://she.self.com.tw/#chapter=profile">個人官網 ↗</a>
          <a href="https://she.self.com.tw/workspace/?view=card">
            個人化名片 ↗
          </a>
          <a href="https://www.self.com.tw/">己美 SELF ↗</a>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} SELF PAGEANT</span>
          <span>BEAUTY · CULTURE · STORIES · CONNECTIONS</span>
        </div>
      </div>
    </footer>
  );
}
