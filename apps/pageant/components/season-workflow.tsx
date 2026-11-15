"use client";
import { MISS_TAIWAN as season, roundGate } from "@/lib/miss-taiwan";
import { PLATFORM, statusLabel } from "@/lib/domain";
import type { Doc } from "./editors";
export function SeasonWorkflow({
  project,
  workspace,
  canEdit,
  onEdit,
  onTask,
  onNavigate,
}: {
  project: Doc;
  workspace: Doc;
  canEdit: boolean;
  onEdit: (a: Doc) => void;
  onTask: (i: Doc) => void;
  onNavigate: (section: string) => void;
}) {
  if (project.id !== season.project_id) return null;
  const activities: Doc[] = workspace.activities || [],
    items: Doc[] = workspace.items || [];
  return (
    <section className="panel season-workflow">
      <div className="panel-top">
        <div>
          <span className="eyebrow">MISS TAIWAN · THE SEASON PLAN</span>
          <h2>2027 五場選拔執行台</h2>
        </div>
        <a
          href="/misstaiwan"
          target="_blank"
          rel="noopener noreferrer"
          className="small-button"
        >
          預覽招募官網 ↗
        </a>
      </div>
      <p>
        2026 年 12
        月中預定啟動記者會。五場賽事、培訓與宣傳均保留草稿，確認日期、規則及條款後再開放。工作完成度不等於賽事成績或正式晉級。
      </p>
      <div className="season-flow-grid">
        {season.rounds.map((r, i) => {
          const a = activities.find((a) => a.id === r.id),
            task = items.find((t) => t.id === r.task_id),
            previous = i
              ? items.find((t) => t.id === season.rounds[i - 1].task_id)
              : null;
          return (
            <article key={r.key} className="season-round">
              <small>
                ROUND 0{r.order} · {r.en}
              </small>
              <h3>{r.title}</h3>
              <small>
                {a?.starts_at
                  ? new Date(a.starts_at).toLocaleString("zh-TW", {
                      timeZone: "Asia/Taipei",
                    })
                  : "日期與場地待確認"}
              </small>
              <span className="badge">
                {a ? statusLabel[a.status] : "尚未建立活動"}
              </span>
              <div className="season-gate">
                {roundGate(
                  task ? [{ status: task.status }] : [],
                  previous?.status,
                )}
              </div>
              <details>
                <summary>本場準備清單</summary>
                <ul>
                  {r.checklist.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              </details>
              {a && canEdit && (
                <button className="small-button" onClick={() => onEdit(a)}>
                  設定本場賽事
                </button>
              )}
              {task && (
                <button className="small-button" onClick={() => onTask(task)}>
                  查看工作與進度
                </button>
              )}
            </article>
          );
        })}
      </div>
      <div className="season-flow-links">
        <button className="small-button" onClick={() => onNavigate("training")}>
          排課與學員
        </button>
        <button
          className="small-button"
          onClick={() => onNavigate("invitation")}
        >
          記者會與嘉賓
        </button>
        <button className="small-button" onClick={() => onNavigate("sponsor")}>
          品牌洽談與交付
        </button>
        <button
          className="small-button"
          onClick={() => onNavigate("promotion")}
        >
          新聞與宣傳
        </button>
        <button
          className="small-button"
          onClick={() => onNavigate("competition")}
        >
          比賽當日流程
        </button>
        <a
          className="small-button"
          href={PLATFORM + "/activities/" + season.interest_id}
          target="_blank"
          rel="noopener noreferrer"
        >
          檢查意願登記頁 ↗
        </a>
      </div>
      <p className="muted">
        參賽及媒體意願名單在「活動與人員 →
        招募與比賽」查看。意願核准不代表正式參賽、席次或付費票券。
      </p>
    </section>
  );
}
