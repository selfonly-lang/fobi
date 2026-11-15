import Link from "next/link";
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
export function MissTaiwanHome({
  data,
  project,
}: {
  data: Catalog;
  project: Project;
}) {
  const interest = data.activities.find(
    (a) => a.id === season.interest_id && a.status === "open",
  );
  const media = data.activities.find(
    (a) => a.id === season.media_interest_id && a.status === "open",
  );
  const stories = data.articles.filter((a) => a.project_id === project.id);
  return (
    <div className="mt-site">
      <section className="mt-hero" aria-labelledby="mt-title">
        <img
          className="mt-hero-image"
          src={season.hero}
          alt="三位虛構成人模特兒穿著訂製禮服的 AI 招募形象示意"
          width={1672}
          height={941}
          fetchPriority="high"
        />
        <div className="mt-hero-copy">
          <span className="mt-kicker">MISS TAIWAN · 2027</span>
          <p className="mt-overline">台灣小姐選拔</p>
          <h1 id="mt-title">
            妳的光，
            <br />
            值得被<i>世界</i>
            <br />
            看見。
          </h1>
          <p className="mt-hero-intro">
            不只是一個舞台。
            <br />
            是妳勇敢走向自己的開始。
          </p>
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
            招募意願登記中 · 正式簡章另行公告
          </span>
        </div>
        <span className="mt-image-credit">AI 形象示意｜非本屆參賽者</span>
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
        <a href="#join">我要參賽</a>
        <a href="#partners">品牌合作</a>
        <a href="#stories">最新消息</a>
      </nav>
      <section id="launch" className="mt-section mt-launch">
        <Reveal>
          <span className="mt-kicker">THE YEAR BEGINS HERE</span>
          <h2>
            下一段旅程，
            <br />
            從一次勇敢開始。
          </h2>
          <p>
            2027
            台灣小姐選拔計畫，將串連招募、舞台培訓、五場選拔與媒體故事，讓自信、才華及文化表達都有被看見的機會。
          </p>
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
            DEC<span>2026</span>
          </span>
          <h3>年度計畫啟動記者會</h3>
          <p>
            <CalendarDays size={17} />
            2026 年 12 月中 · 預定
          </p>
          <p>
            將公布 2027
            選拔計畫與後續招募安排。確切日期、時間、場地及出席方式確認後公告。
          </p>
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
        <figure>
          <img
            src={season.training_image}
            alt="AI 形象示意：虛構成人模特兒練習儀態與文化表達，非實際上課紀錄"
            width={1672}
            height={941}
            loading="lazy"
          />
          <figcaption>AI 培訓形象示意｜非實際講師或課程紀錄</figcaption>
        </figure>
        <Reveal>
          <span className="mt-kicker">GROW INTO YOUR OWN</span>
          <h2>
            妳不必一開始，
            <br />
            就知道怎麼發光。
          </h2>
          <p>
            讓每一次練習，都成為妳的底氣。培訓規劃從姿態、表達到文化敘事，陪妳準備每一個舞台。
          </p>
          <div className="mt-course-list">
            {season.training.map((t, i) => (
              <details key={t.key}>
                <summary>
                  <span>0{i + 1}</span>
                  <h3>{t.title}</h3>
                  <b aria-hidden="true">＋</b>
                </summary>
                <p>{t.description}</p>
                <ul>
                  {t.units.map((u) => (
                    <li key={u}>{u}</li>
                  ))}
                </ul>
              </details>
            ))}
          </div>
          <small>
            以上為培訓規劃方向。講師、課表、名額、費用及是否包含於參賽方案，將於正式簡章確認。
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
              <p>登記入口準備中，請先追蹤官方粉專。</p>
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
          <h2>
            與妳的品牌一起，
            <br />
            讓台灣走向世界。
          </h2>
          <p>
            從服裝與美妝、舞台與場地，到媒體、文化與生活風格。一起討論適合品牌的參與方式，讓支持成為可被記錄的故事。
          </p>
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
