import { Fragment } from "react";
import { getWebsite } from "@/lib/website";
import { photoLabel } from "@/lib/website-types";
import {
  ArrowUpRight,
  ArrowDown,
  Check,
  Globe2,
  CalendarDays,
} from "lucide-react";
import type { Catalog, Project } from "@/lib/types";
import { MISS_TAIWAN as season } from "@/lib/miss-taiwan";
import { PLATFORM } from "@/lib/domain";
import { Reveal } from "./motion";
import { StoryCard } from "./public";
const registration = (id: string) => PLATFORM + "/activities/" + id;
export async function MissTaiwanHome({
  data,
  project,
}: {
  data: Catalog;
  project: Project;
}) {
  const content = await getWebsite(project.id);
  const lines = (text: string) =>
    text.split("\n").map((line, i) => (
      <Fragment key={i}>
        {i > 0 && <br />}
        {line}
      </Fragment>
    ));
  const interest = data.activities.find(
    (a) => a.id === season.interest_id && a.status === "open" && a.amount === 0,
  );
  const media = data.activities.find(
    (a) =>
      a.id === season.media_interest_id &&
      a.status === "open" &&
      a.amount === 0,
  );
  const press = data.activities.find((a) => a.id === season.press_id);
  const stories = data.articles.filter((a) => a.project_id === project.id);
  return (
    <div className="mt-site">
      <section
        className={
          "mt-hero " +
          (content.hero_photo.kind === "real" ? "mt-real-hero" : "")
        }
        aria-labelledby="mt-title"
      >
        <img
          className="mt-hero-image"
          src={content.hero_photo.url}
          alt={content.hero_photo.alt}
          style={{
            objectPosition: `${content.hero_photo.focal_x}% ${content.hero_photo.focal_y}%`,
          }}
          width={1672}
          height={941}
          fetchPriority="high"
        />
        <div className="mt-hero-copy">
          <span className="mt-kicker">MISS TAIWAN · 2027</span>
          <p className="mt-overline">{content.brand_name}</p>
          <h1 id="mt-title">{lines(content.headline)}</h1>
          <p className="mt-hero-intro">{lines(content.intro)}</p>
          <div className="mt-actions">
            <a
              href={interest ? registration(interest.id) : "#join"}
              className="button dark"
            >
              {interest ? "我要登記參賽意願" : "查看招募資訊"}
              <ArrowUpRight size={17} />
            </a>
            <a href="#journey" className="mt-text-link">
              認識五場賽程 <ArrowDown size={16} />
            </a>
          </div>
          <span className="mt-hero-note">
            {interest
              ? "招募意願登記中 · 正式簡章另行公告"
              : "招募資訊依正式公告"}
          </span>
        </div>
        <a
          className="mt-image-credit"
          href={content.hero_photo.source_url}
          target="_blank"
          rel="noopener noreferrer"
        >
          {photoLabel(content.hero_photo)}｜{content.hero_photo.source_label} ↗
        </a>
        <span className="mt-hero-edition" aria-hidden="true">
          THE NEXT CHAPTER
          <br />
          <b>2027</b>
        </span>
      </section>
      <nav className="mt-section-nav" aria-label="台灣小姐官網章節">
        <a href="#launch">年度啟動</a>
        <a href="#journey">五場賽事</a>
        <a href="#training">培訓計畫</a>
        <a href="#moments">人物與活動</a>
        <a href="#join">我要參賽</a>
        <a href="#partners">品牌合作</a>
        <a href="#stories">最新消息</a>
      </nav>
      <section id="launch" className="mt-section mt-launch">
        <Reveal>
          <span className="mt-kicker">THE YEAR BEGINS HERE</span>
          <h2>{lines(content.about_heading)}</h2>
          <p>{content.about_body}</p>
          <a
            href={season.facebook}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-text-link"
          >
            追蹤台灣小姐官方粉專 <ArrowUpRight size={16} />
          </a>
        </Reveal>
        <Reveal className="mt-date-card" delay={0.1}>
          <span className="mt-kicker">2027 SEASON LAUNCH</span>
          <span className="mt-date">
            {press?.starts_at
              ? new Date(press.starts_at)
                  .toLocaleString("en-US", {
                    month: "short",
                    timeZone: "Asia/Taipei",
                  })
                  .toUpperCase()
              : "DEC"}
            <span>
              {press?.starts_at
                ? new Date(press.starts_at).toLocaleString("en-US", {
                    year: "numeric",
                    timeZone: "Asia/Taipei",
                  })
                : "2026"}
            </span>
          </span>
          <h3>年度計畫啟動記者會</h3>
          <p>
            <CalendarDays size={17} />
            {press?.starts_at
              ? new Date(press.starts_at).toLocaleString("zh-TW", {
                  timeZone: "Asia/Taipei",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "2026 年 12 月中 · 預定"}
          </p>
          <p>
            {press?.starts_at
              ? "將說明2027選拔計畫與後續招募安排，出席方式以主辦確認為準。"
              : "將公布2027選拔計畫與後續招募安排。確切日期、時間、場地及出席方式確認後公告。"}
          </p>
          {press?.venue && <p>場地：{press.venue}</p>}
          {media && (
            <a href={registration(media.id)} className="button dark">
              媒體採訪意願登記 <ArrowUpRight size={16} />
            </a>
          )}
          <small>意願登記不等於記者會席次確認。</small>
        </Reveal>
      </section>
      <section id="journey" className="mt-journey">
        <div className="mt-section">
          <Reveal className="mt-section-heading">
            <div>
              <span className="mt-kicker">
                FIVE STAGES. ONE EXTRAORDINARY YOU.
              </span>
              <h2>
                五個舞台，
                <br />
                一段蛻變的旅程。
              </h2>
            </div>
            <p>
              從第一次自我介紹，到總決賽的聚光燈。
              <br />
              每一場，都是更靠近自己的練習。
            </p>
          </Reveal>
          <div className="mt-rounds">
            {season.rounds.map((r) => {
              const a = data.activities.find((a) => a.id === r.id);
              return (
                <details className="mt-round" key={r.key}>
                  <summary>
                    <span className="mt-round-number">0{r.order}</span>
                    <span>
                      <small>{r.en}</small>
                      <h3>{a?.title || r.title}</h3>
                    </span>
                    <span className="mt-round-status">
                      {a?.starts_at
                        ? new Date(a.starts_at).toLocaleDateString("zh-TW", {
                            timeZone: "Asia/Taipei",
                          })
                        : r.planned_period}
                    </span>
                    <span className="mt-round-plus" aria-hidden="true">
                      ＋
                    </span>
                  </summary>
                  <div className="mt-round-content">
                    <h4>{r.headline}</h4>
                    <p>{a?.description || r.description}</p>
                    <ul>
                      {r.focus.map((f) => (
                        <li key={f}>
                          <Check size={15} />
                          {f}
                        </li>
                      ))}
                    </ul>
                    {a?.status === "open" ? (
                      <a href={registration(a.id)} className="button white">
                        查看本場資訊 <ArrowUpRight size={16} />
                      </a>
                    ) : (
                      <p className="mt-round-disclaimer">
                        賽制方向已規劃；正式規則、晉級名額及評審辦法確認後公告。
                      </p>
                    )}
                  </div>
                </details>
              );
            })}
          </div>
          <p className="mt-fineprint">
            五場賽事均規劃於 2027
            年；確切日期、城市、場地與參賽條件以正式公告為準。
          </p>
        </div>
      </section>
      <section id="training" className="mt-section mt-training">
        {content.training_photo && (
          <figure>
            <img
              src={content.training_photo.url}
              alt={content.training_photo.alt}
              style={{
                objectPosition: `${content.training_photo.focal_x}% ${content.training_photo.focal_y}%`,
              }}
              width={1672}
              height={941}
              loading="lazy"
            />
            <figcaption>
              {photoLabel(content.training_photo)}｜
              {content.training_photo.caption}
              <br />
              <a
                href={content.training_photo.source_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                {content.training_photo.source_label} ↗
              </a>
            </figcaption>
          </figure>
        )}
        <Reveal>
          <span className="mt-kicker">GROW INTO YOUR OWN</span>
          <h2>{lines(content.training_heading)}</h2>
          <p>{content.training_body}</p>
          <div className="mt-course-list">
            {season.training.map((t, i) => {
              const course = data.activities.find((a) => a.id === t.id);
              return (
                <details key={t.key}>
                  <summary>
                    <span>0{i + 1}</span>
                    <h3>{t.title}</h3>
                    <b aria-hidden="true">＋</b>
                  </summary>
                  <p>{course?.description || t.description}</p>
                  <ul>
                    {t.units.map((u) => (
                      <li key={u}>{u}</li>
                    ))}
                  </ul>
                  {course?.status === "open" && (
                    <a className="mt-text-link" href={registration(course.id)}>
                      查看課程與報名 <ArrowUpRight size={16} />
                    </a>
                  )}
                </details>
              );
            })}
          </div>
          <small>
            以上為培訓規劃方向。實際講師、課表、名額、費用及是否包含於參賽方案，請以各課程頁與正式簡章為準。
          </small>
        </Reveal>
      </section>
      <section id="join" className="mt-join">
        <div className="mt-section">
          <Reveal>
            <span className="mt-kicker">YOUR FIRST STEP</span>
            <h2>
              這一次，
              <br />
              把機會留給自己。
            </h2>
            <p>
              先留下妳的參賽意願，準備認識下一個自己。
              <br />
              目前不收取參賽費，也不代表已取得參賽資格。
            </p>
            <div className="mt-join-steps">
              <span>
                <b>01</b>登入會員
              </span>
              <span>
                <b>02</b>填寫意願資料
              </span>
              <span>
                <b>03</b>留意正式公告
              </span>
            </div>
            {interest ? (
              <a className="button dark" href={registration(interest.id)}>
                免費登記參賽意願 <ArrowUpRight size={17} />
              </a>
            ) : (
              <p>本階段未開放意願登記，請留意官方粉專公告。</p>
            )}
            <div className="mt-faq">
              <details>
                <summary>現在登記就是正式報名嗎？</summary>
                <p>
                  目前為參賽意願登記。正式簡章、資格審核、報名日期及費用確認後，須依正式流程辦理；登記不保證入選。
                </p>
              </details>
              <details>
                <summary>年齡、身高與國籍條件是什麼？</summary>
                <p>
                  2027
                  年參賽條件尚待正式簡章確認，不沿用舊屆資格。請先登記意願，並於正式報名前確認最新規則。
                </p>
              </details>
              <details>
                <summary>可以先購票或支付參賽費嗎？</summary>
                <p>
                  目前僅開放免費意願登記，五場比賽尚未開放售票或收取參賽費。公開票種、費用及退費條款將另行公告。
                </p>
              </details>
            </div>
          </Reveal>
        </div>
        <span className="mt-join-watermark" aria-hidden="true">
          BE
          <br />
          YOU.
        </span>
      </section>
      <section id="partners" className="mt-section mt-partners">
        <div>
          <span className="mt-kicker">A BEAUTIFUL COLLABORATION</span>
          <h2>{lines(content.partner_heading)}</h2>
          <p>{content.partner_body}</p>
        </div>
        <div className="mt-partner-options">
          <span>品牌與物資合作</span>
          <span>服裝與文化創作</span>
          <span>場地與活動支援</span>
          <span>媒體與影像合作</span>
          <a
            className="button dark"
            href={PLATFORM + "/partners?project=" + project.id}
          >
            我要洽談品牌合作 <ArrowUpRight size={17} />
          </a>
          <small>合作內容、報價與權益依雙方確認；尚未列示已簽約贊助商。</small>
        </div>
      </section>
      {content.gallery.length > 0 && (
        <section id="moments" className="mt-section mt-moments">
          <div className="mt-section-heading">
            <div>
              <span className="mt-kicker">REAL PEOPLE. REAL MOMENTS.</span>
              <h2>{lines(content.gallery_heading)}</h2>
            </div>
            <p>{content.gallery_intro}</p>
          </div>
          <div className="mt-photo-grid">
            {content.gallery.map((photo, i) => (
              <figure key={photo.id + String(i)}>
                <a href={photo.url} target="_blank" rel="noopener noreferrer">
                  <img
                    src={photo.url}
                    alt={photo.alt}
                    width={800}
                    height={800}
                    loading="lazy"
                    style={{
                      objectPosition: `${photo.focal_x}% ${photo.focal_y}%`,
                    }}
                  />
                </a>
                <figcaption>
                  <span>{photoLabel(photo)}</span>
                  <p>{photo.caption}</p>
                  <a
                    href={photo.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {photo.source_label} ↗
                  </a>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}
      <section id="stories" className="mt-section mt-stories">
        <div className="mt-section-heading">
          <div>
            <span className="mt-kicker">THE OFFICIAL JOURNAL</span>
            <h2>故事，正要開始。</h2>
          </div>
          <a
            href={season.facebook}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-text-link"
          >
            官方粉專動態 <ArrowUpRight size={16} />
          </a>
        </div>
        {stories.length ? (
          <div className="story-grid">
            {stories.slice(0, 3).map((a) => (
              <StoryCard key={a.id} article={a} projects={data.projects} />
            ))}
          </div>
        ) : (
          <div className="mt-story-coming">
            <Globe2 size={24} />
            <p>年度啟動與招募消息，確認後將於官網及官方粉專同步公告。</p>
          </div>
        )}
      </section>
      <div className="mt-bottom-bar">
        <b>
          MISS TAIWAN <i>2027</i>
        </b>
        <a href={interest ? registration(interest.id) : "#join"}>
          {interest ? "登記參賽意願" : "查看招募資訊"}{" "}
          <ArrowUpRight size={16} />
        </a>
      </div>
    </div>
  );
}
