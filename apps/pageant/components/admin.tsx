"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/client-api";
import { Badge, Dialog, Field } from "./controls";
import { FeeEditor, DataTable } from "./finance";
import type { Doc } from "./editors";
export function AdminPanel({
  onProjectChange,
}: {
  onProjectChange: () => Promise<void>;
}) {
  const [data, setData] = useState<Doc | null>(null),
    [tab, setTab] = useState("review"),
    [modal, setModal] = useState<Doc | null>(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [catalog, setCatalog] = useState<Doc | null>(null);
  const load = async () => {
    const [d, c] = await Promise.all([
      api("admin"),
      fetch("/api/catalog").then((r) => r.json()),
    ]);
    setData(d);
    setCatalog(c);
  };
  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fn();
      await load();
      await onProjectChange();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const commerce =
      data?.settings.find((s: Doc) => s.key === "commerce")?.value || {},
    home = data?.settings.find((s: Doc) => s.key === "homepage")?.value || {};
  return (
    <>
      <nav className="workspace-tabs">
        {[
          ["review", "專案與主辦審核"],
          ["brands", "品牌官網"],
          ["home", "首頁編排"],
          ["commerce", "金流與服務費"],
          ["integrations", "服務與發布紀錄"],
        ].map(([id, l]) => (
          <button
            key={id}
            className={tab === id ? "active" : ""}
            onClick={() => setTab(id)}
          >
            {l}
          </button>
        ))}
      </nav>
      {error && <div className="alert">{error}</div>}
      {notice && <div className="notice">{notice}</div>}
      {!data ? (
        <section className="panel">正在讀取平台設定…</section>
      ) : (
        <>
          {tab === "review" && (
            <section className="panel">
              <h2>專案公開審核</h2>
              <p>
                會員先建立草稿；平台確認主辦與內容後，才出現在賽事列表及官方媒體。
              </p>
              {data.projects.map((p: Doc) => (
                <div className="list-row" key={p.id}>
                  <div>
                    <h3>{p.title}</h3>
                    <p>
                      {data.organizations.find(
                        (o: Doc) => o.id === p.organization_id,
                      )?.name || "平台預設專案"}{" "}
                      · {p.year}
                    </p>
                  </div>
                  <Badge status={p.review_status} />
                  {p.review_status === "pending" && (
                    <>
                      <button
                        className="small-button"
                        disabled={busy}
                        onClick={() => {
                          if (
                            confirm("確認已檢視主辦資料與專案，並公開此專案？")
                          )
                            run(async () => {
                              await api("review-project", {
                                id: p.id,
                                status: "approved",
                              });
                              setNotice("專案已核准公開。");
                            });
                        }}
                      >
                        核准
                      </button>
                      <button
                        className="small-button"
                        disabled={busy}
                        onClick={() =>
                          run(async () => {
                            await api("review-project", {
                              id: p.id,
                              status: "rejected",
                            });
                          })
                        }
                      >
                        退回
                      </button>
                    </>
                  )}
                </div>
              ))}
            </section>
          )}
          {tab === "brands" && (
            <section className="panel">
              <div className="panel-top">
                <h2>賽事品牌與年度官網</h2>
                <button
                  className="button dark"
                  onClick={() =>
                    setModal({
                      type: "brand",
                      slug: "",
                      name: "",
                      domain: "",
                      wordmark: "",
                      accent: "#aa8856",
                      project_id: "",
                    })
                  }
                >
                  新增品牌
                </button>
              </div>
              <p>
                每個品牌固定使用一個簡寫.self.com.tw，年度專案共用品牌官網。新網址需完成
                Vercel 網域綁定、DNS 與 HTTPS，驗證成功後才顯示正式官網入口。
              </p>
              {data.brands.map((b: Doc) => (
                <div className="list-row" key={b.id}>
                  <div>
                    <h3>{b.name}</h3>
                    <p>
                      {b.domain} ·{" "}
                      {b.domain_status === "verified"
                        ? "網址已驗證"
                        : "網址待設定"}
                    </p>
                  </div>
                  <a
                    className="small-button"
                    href={"/preview/" + b.slug}
                    target="_blank"
                    rel="noopener"
                  >
                    預覽
                  </a>
                  <button
                    className="small-button"
                    onClick={() =>
                      setModal({
                        ...b,
                        type: "brand",
                        wordmark: b.theme?.wordmark,
                        accent: b.theme?.accent,
                        logo_url: b.theme?.logo_url,
                        project_id: b.primary_project_id,
                      })
                    }
                  >
                    編輯
                  </button>
                  {b.domain_status !== "verified" && (
                    <button
                      className="small-button"
                      disabled={busy}
                      onClick={() =>
                        run(async () => {
                          await api("activate-brand", {
                            id: b.id,
                            primary_project_id: b.primary_project_id,
                          });
                          setNotice("HTTPS 與專案連結驗證成功。");
                        })
                      }
                    >
                      驗證並啟用
                    </button>
                  )}
                </div>
              ))}
            </section>
          )}
          {tab === "home" && (
            <section className="panel">
              <h2>雜誌首頁編排</h2>
              <form
                key={JSON.stringify(home)}
                onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  run(async () => {
                    await api("save-homepage", {
                      hero_article_id: fd.get("hero_article_id"),
                      feature_article_id: fd.get("feature_article_id"),
                    });
                    setNotice("首頁選稿已更新。");
                  });
                }}
              >
                {[
                  ["hero_article_id", "首頁主打報導"],
                  ["feature_article_id", "人物專題"],
                ].map(([key, l]) => (
                  <Field key={key} label={l}>
                    <select name={key} defaultValue={home[key] || ""}>
                      <option value="">沿用編輯預設</option>
                      {catalog?.articles?.map((a: Doc) => (
                        <option key={a.id} value={a.id}>
                          {a.content.title}
                        </option>
                      ))}
                    </select>
                  </Field>
                ))}
                <button className="button dark" disabled={busy}>
                  儲存首頁編排
                </button>
              </form>
            </section>
          )}
          {tab === "commerce" && (
            <>
              <section className="panel">
                <h2>平台代收與主辦結算</h2>
                <form
                  key={JSON.stringify(commerce)}
                  onSubmit={(e) => {
                    e.preventDefault();
                    const fd = new FormData(e.currentTarget);
                    run(async () => {
                      await api("save-commerce-settings", {
                        enabled: fd.has("enabled"),
                        merchant_reviewed: fd.has("merchant_reviewed"),
                        payouts_enabled: fd.has("payouts_enabled"),
                      });
                      setNotice("金流設定已儲存。");
                    });
                  }}
                >
                  {[
                    [
                      "merchant_reviewed",
                      "已確認正式商店契約允許平台代收及主辦結算",
                    ],
                    ["enabled", "開放新制正式收款"],
                    ["payouts_enabled", "開放已審核結案款項的撥款記錄"],
                  ].map(([k, l]) => (
                    <label className="checkbox-field" key={k}>
                      <input
                        type="checkbox"
                        name={k}
                        defaultChecked={commerce[k] === true}
                      />
                      {l}
                    </label>
                  ))}
                  <button className="button dark" disabled={busy}>
                    儲存正式金流設定
                  </button>
                  <p className="muted">
                    沒有確認費率及金流條件的活動不可收款；FOBI 2026
                    歷史票務保持關閉。
                  </p>
                </form>
              </section>
              <section className="panel">
                <h2>平台標準服務費</h2>
                {data.fees
                  .filter((f: Doc) => !f.project_id)
                  .map((f: Doc) => (
                    <div className="list-row" key={f.id}>
                      <div>
                        <h3>
                          {
                            { ticket: "售票", course: "課程", sponsor: "贊助" }[
                              f.kind as "ticket"
                            ]
                          }
                        </h3>
                        <p>
                          {f.enabled
                            ? f.rate_bps / 100 + "% · " + f.terms
                            : "尚未啟用"}
                        </p>
                      </div>
                      <button
                        className="small-button"
                        onClick={() => setModal({ type: "fee", initial: f })}
                      >
                        設定費率
                      </button>
                    </div>
                  ))}
              </section>
            </>
          )}
          {tab === "integrations" && (
            <>
              <section className="panel">
                <h2>安全後台服務狀態</h2>
                <div className="readiness-grid">
                  {[
                    ["ai", "AI 活動製造機"],
                    ["video", "Cloudflare 影片上傳"],
                    ["payment", "綠界正式支付"],
                    ["facebook", "Facebook 發布"],
                    ["line", "LINE 官方推播"],
                  ].map(([k, l]) => (
                    <div key={k}>
                      <b>{l}</b>
                      <span>
                        {data.readiness[k] ? "安全設定已存在" : "尚未設定"}
                      </span>
                      <small>
                        {k === "ai"
                          ? "優先沿用 SELF 安全後台既有 OpenAI 金鑰。"
                          : k === "payment"
                            ? "另須確認商店資格、條款及平台費率。"
                            : "完成授權後才能啟用；系統不會以示範成功取代真實結果。"}
                      </small>
                    </div>
                  ))}
                </div>
                <p className="muted">
                  發票使用實際外部開立紀錄及憑證登記，尚未自動串接電子發票服務。
                </p>
              </section>
              <section className="panel">
                <h2>社群發布紀錄</h2>
                {data.channels
                  .filter((j: Doc) => j.status === "review")
                  .map((j: Doc) => (
                    <div className="list-row" key={j.id}>
                      <div>
                        <h3>
                          {j.channel} · {j.payload?.message?.slice(0, 100)}
                        </h3>
                        <p>{j.payload?.link}</p>
                      </div>
                      <button
                        className="small-button"
                        disabled={busy}
                        onClick={() => {
                          if (confirm("確認核准此新聞發送至平台官方渠道？"))
                            run(async () => {
                              await api("review-channel", {
                                id: j.id,
                                status: "approved",
                              });
                            });
                        }}
                      >
                        核准發布
                      </button>
                      <button
                        className="small-button"
                        disabled={busy}
                        onClick={() =>
                          run(async () => {
                            await api("review-channel", {
                              id: j.id,
                              status: "rejected",
                            });
                          })
                        }
                      >
                        退回
                      </button>
                    </div>
                  ))}
                <DataTable
                  rows={data.channels}
                  columns={[
                    ["created_at", "建立時間"],
                    ["channel", "渠道"],
                    ["status", "狀態"],
                    ["public_url", "公開連結"],
                    ["error_code", "訊息"],
                  ]}
                />
              </section>
            </>
          )}
        </>
      )}
      {modal?.type === "fee" && (
        <FeeEditor
          initial={modal.initial}
          onClose={() => setModal(null)}
          onSaved={load}
        />
      )}{" "}
      {modal?.type === "brand" && (
        <Dialog title="賽事品牌與官網" onClose={() => setModal(null)}>
          {error && <div className="alert">{error}</div>}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              run(async () => {
                await api("save-brand", modal);
                setModal(null);
              });
            }}
          >
            {[
              ["name", "品牌名稱"],
              ["slug", "品牌代稱（小寫英文／數字）"],
              ["domain", "官網網域（不含 https://）"],
              ["wordmark", "英文品牌字樣"],
              ["accent", "品牌色 HEX"],
              ["logo_url", "已授權去背 Logo 網址"],
            ].map(([k, l]) => (
              <Field key={k} label={l}>
                <input
                  required={["name", "slug", "domain"].includes(k)}
                  value={modal[k] || ""}
                  disabled={k === "slug" && !!modal.id}
                  onChange={(e) => setModal({ ...modal, [k]: e.target.value })}
                />
              </Field>
            ))}
            <Field label="主要年度專案">
              <select
                required
                value={modal.project_id || ""}
                onChange={(e) =>
                  setModal({ ...modal, project_id: e.target.value })
                }
              >
                <option value="">請選擇已核准專案</option>
                {data?.projects
                  .filter((p: Doc) => p.review_status === "approved")
                  .map((p: Doc) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
              </select>
            </Field>
            <button className="button dark" disabled={busy}>
              儲存品牌
            </button>
          </form>
        </Dialog>
      )}
    </>
  );
}
