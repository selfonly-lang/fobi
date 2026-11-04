"use client";
import { useEffect, useRef, useState } from "react";
import { Camera, Check, Plus, Send, StopCircle, Download } from "lucide-react";
import { api, exportCsv } from "@/lib/client-api";
import { Badge, Field } from "./controls";
import { RecordEditor, type Doc } from "./editors";
export function PeoplePanel({
  projectId,
  role,
  workspace,
  people,
  currentUser,
  onSaved,
}: {
  projectId: string;
  role: string;
  workspace: Doc;
  people: Doc | null;
  currentUser: Doc;
  onSaved: () => Promise<void>;
}) {
  const [tab, setTab] = useState(
      role === "judge"
        ? "judges"
        : role === "checkin"
          ? "checkin"
          : "activities",
    ),
    [modal, setModal] = useState<Doc | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [activityId, setActivityId] = useState(""),
    [team, setTeam] = useState<Doc | null>(null),
    [scoreDraft, setScoreDraft] = useState<Record<string, Doc>>({});
  const canEdit = ["owner", "manager", "editor"].includes(role),
    manage = ["owner", "manager"].includes(role),
    canCheck = ["owner", "manager", "checkin"].includes(role);
  const activities = workspace.activities || [],
    competitions = activities.filter((a: Doc) =>
      ["pageant", "segment", "final"].includes(a.kind),
    );
  const chosen = activityId || competitions[0]?.id || "";
  useEffect(() => {
    if (manage)
      api("team", undefined, { project: projectId })
        .then(setTeam)
        .catch(() => null);
  }, [projectId, manage]);
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const registrations = people?.registrations || workspace.registrations || [];
  const tabs =
    role === "checkin"
      ? [["checkin", "現場核銷"]]
      : role === "judge"
        ? [["judges", "我的評分"]]
        : [
            ["activities", "子活動與課程"],
            ["registrations", "報名與出席"],
            ["contestants", "佳麗介紹"],
            ["judges", "評審與成績"],
            ...(canCheck ? [["checkin", "現場核銷"]] : []),
          ];
  return (
    <>
      <nav className="workspace-tabs">
        {tabs.map(([id, l]) => (
          <button
            key={id}
            className={tab === id ? "active" : ""}
            onClick={() => setTab(id)}
          >
            {l}
          </button>
        ))}
      </nav>
      {error && (
        <div className="alert" role="alert">
          {error}
        </div>
      )}
      {notice && (
        <div className="notice" role="status">
          {notice}
        </div>
      )}
      {tab === "activities" && (
        <section className="panel">
          <div className="panel-top">
            <h2>同一專案，各有完整的活動</h2>
            {canEdit && (
              <button
                className="button dark"
                onClick={() =>
                  setModal({
                    type: "activity",
                    initial: {
                      title: "",
                      kind: "pageant",
                      status: "draft",
                      amount: 0,
                      capacity: 0,
                      timezone: "Asia/Taipei",
                      fee_kind: "ticket",
                      config: {},
                    },
                  })
                }
              >
                <Plus size={15} />
                新增活動／課程
              </button>
            )}
          </div>
          <p>
            課程、培訓、記者會、單項賽與總決賽可分別管理日期、名額與票價，並歸屬同一個賽事專案。
          </p>
          {activities.length ? (
            activities.map((a: Doc) => (
              <div className="list-row" key={a.id}>
                <div>
                  <h3>{a.title}</h3>
                  <p>
                    {a.starts_at
                      ? new Date(a.starts_at).toLocaleString("zh-TW", {
                          timeZone: a.timezone || "Asia/Taipei",
                        })
                      : "日期待確認"}{" "}
                    · {a.venue || "場地待確認"}
                  </p>
                </div>
                <Badge status={a.status} />
                <button
                  className="small-button"
                  onClick={() => setModal({ type: "activity", initial: a })}
                >
                  {canEdit ? "編輯" : "查看"}
                </button>
              </div>
            ))
          ) : (
            <div className="empty-public">
              <h3>從一個子活動開始</h3>
              <p>資料確認前先保留為草稿，不會出現在官網或購票列表。</p>
            </div>
          )}
        </section>
      )}
      {tab === "registrations" && (
        <section className="panel">
          <div className="panel-top">
            <h2>報名、審核與出席</h2>
            <button
              className="small-button"
              onClick={() =>
                exportCsv(
                  "報名與出席",
                  registrations.map((r: Doc) => ({
                    姓名: r.profile?.name,
                    活動: r.activity?.title,
                    狀態: r.status,
                    Email: r.profile?.email,
                    電話: r.profile?.phone,
                  })),
                )
              }
            >
              <Download size={14} />
              匯出
            </button>
          </div>
          {registrations.length ? (
            registrations.map((r: Doc) => (
              <div className="list-row" key={r.id}>
                <div>
                  <h3>{r.profile?.name || "報名會員"}</h3>
                  <p>
                    {r.activity?.title} · {r.profile?.country || ""}
                  </p>
                  {r.profile?.email && (
                    <p>
                      {r.profile.email} · {r.profile.phone}
                    </p>
                  )}
                </div>
                <Badge status={r.status} />
                {canEdit && r.status === "pending" && (
                  <>
                    <button
                      className="small-button"
                      disabled={busy}
                      onClick={() =>
                        run(async () => {
                          await api("review-registration", {
                            id: r.id,
                            status: "approved",
                          });
                          await onSaved();
                        })
                      }
                    >
                      核准
                    </button>
                    <button
                      className="small-button"
                      disabled={busy}
                      onClick={() =>
                        run(async () => {
                          await api("review-registration", {
                            id: r.id,
                            status: "rejected",
                          });
                          await onSaved();
                        })
                      }
                    >
                      退回
                    </button>
                  </>
                )}
                {(canEdit || canCheck) && r.status === "approved" && (
                  <button
                    className="small-button"
                    disabled={busy}
                    onClick={() =>
                      run(async () => {
                        await api("review-registration", {
                          id: r.id,
                          status: "attended",
                        });
                        await onSaved();
                      })
                    }
                  >
                    確認出席
                  </button>
                )}
                {canEdit && r.status === "approved" && (
                  <button
                    className="small-button"
                    onClick={() =>
                      setModal({
                        type: "contestant",
                        initial: {
                          name: r.profile.name,
                          country: r.profile.country || "",
                          status: "draft",
                          public_consent: false,
                          source_registration: r.id,
                        },
                      })
                    }
                  >
                    建立佳麗介紹
                  </button>
                )}
              </div>
            ))
          ) : (
            <p>目前沒有報名資料。</p>
          )}
        </section>
      )}
      {tab === "contestants" && (
        <section className="panel">
          <div className="panel-top">
            <h2>佳麗與參賽者介紹</h2>
            {canEdit && (
              <button
                className="button dark"
                onClick={() =>
                  setModal({
                    type: "contestant",
                    initial: {
                      name: "",
                      status: "draft",
                      public_consent: false,
                    },
                  })
                }
              >
                <Plus size={15} />
                新增佳麗
              </button>
            )}
          </div>
          <p>
            姓名、介紹與照片需先確認，取得本人公開同意且核准後，才會出現在官方人物頁。
          </p>
          {people?.contestants?.length ? (
            people.contestants.map((c: Doc) => (
              <div className="list-row" key={c.id}>
                <div>
                  <h3>{c.name}</h3>
                  <p>
                    {c.country} ·{" "}
                    {c.public_consent ? "已取得公開同意" : "尚未取得公開同意"}
                  </p>
                </div>
                <Badge status={c.status} />
                <button
                  className="small-button"
                  onClick={() => setModal({ type: "contestant", initial: c })}
                >
                  {canEdit ? "編輯" : "查看"}
                </button>
              </div>
            ))
          ) : (
            <p>尚無已整理的佳麗資料，不會以示範人物代替真實名單。</p>
          )}
        </section>
      )}
      {tab === "judges" && (
        <>
          <section className="panel">
            <div className="panel-top">
              <h2>評審與比賽成績</h2>
              {manage && (people?.scores?.length || 0) > 0 && (
                <button
                  className="small-button"
                  onClick={() =>
                    exportCsv(
                      "比賽評分",
                      (people?.scores || []).map((s: Doc) => ({
                        比賽: s.activity?.title,
                        參賽者: (people?.contestants || []).find(
                          (c: Doc) => c.id === s.contestant_id,
                        )?.name,
                        總分: s.total,
                        已送出: s.submitted,
                        儀態: s.scores.poise,
                        表達: s.scores.expression,
                        舞台: s.scores.stage,
                        綜合: s.scores.impression,
                      })),
                    )
                  }
                >
                  <Download size={14} />
                  匯出評分
                </button>
              )}
            </div>
            <Field label="比賽活動">
              <select
                value={chosen}
                onChange={(e) => setActivityId(e.target.value)}
              >
                <option value="">選擇比賽</option>
                {competitions.map((a: Doc) => (
                  <option key={a.id} value={a.id}>
                    {a.title}
                  </option>
                ))}
              </select>
            </Field>
            {manage && chosen && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  run(async () => {
                    await api("assign-judge", {
                      activity_id: chosen,
                      user_id: fd.get("user_id"),
                    });
                    await onSaved();
                    setNotice("評審已指派。");
                  });
                }}
              >
                <div className="form-actions">
                  <select
                    className="plain-input"
                    name="user_id"
                    required
                    style={{ maxWidth: 300 }}
                  >
                    <option value="">選擇已加入的成員</option>
                    <option value={currentUser.id}>您本人</option>
                    {team?.members
                      ?.filter((m: Doc) => m.user_id !== currentUser.id)
                      .map((m: Doc) => (
                        <option key={m.user_id} value={m.user_id}>
                          {m.name || "專案成員"}
                        </option>
                      ))}
                  </select>
                  <button className="small-button" disabled={busy}>
                    指派評審
                  </button>
                </div>
                <p className="muted">
                  請先從工作室「團隊」邀請評審加入，再指派到實際比賽活動。
                </p>
              </form>
            )}
            {!chosen && <p>建立比賽類型的子活動後，即可指派評審。</p>}
          </section>
          {chosen && (
            <section className="panel">
              <h2>評分表</h2>
              <p>
                儀態、表達、舞台表現及綜合印象各0–100分，四項等權平均。正式送出後不可自行修改；主辦核對完整評分及公開同意後，才發布成績。
              </p>
              {people?.assignments?.some(
                (a: Doc) =>
                  a.activity_id === chosen && a.user_id === currentUser.id,
              ) ? (
                people.contestants
                  .filter((c: Doc) => c.status === "approved")
                  .map((c: Doc) => {
                    const saved = people.scores.find(
                        (s: Doc) =>
                          s.activity_id === chosen &&
                          s.contestant_id === c.id &&
                          s.judge_id === currentUser.id,
                      ),
                      d = scoreDraft[c.id] ||
                        saved?.scores || {
                          poise: 0,
                          expression: 0,
                          stage: 0,
                          impression: 0,
                        };
                    return (
                      <form
                        className="editor-section"
                        key={c.id}
                        onSubmit={(e) => {
                          e.preventDefault();
                          run(async () => {
                            await api("save-score", {
                              activity_id: chosen,
                              contestant_id: c.id,
                              scores: d,
                              version: saved?.version,
                              submitted: true,
                            });
                            await onSaved();
                            setNotice("評分已正式送出。");
                          });
                        }}
                      >
                        <div className="panel-top">
                          <h3>
                            {c.name} · {c.country}
                          </h3>
                          {saved?.submitted && <Badge status="done" />}
                        </div>
                        <fieldset
                          disabled={saved?.submitted || busy}
                          style={{ border: 0, padding: 0 }}
                        >
                          <div className="form-grid">
                            {[
                              ["poise", "儀態"],
                              ["expression", "表達"],
                              ["stage", "舞台表現"],
                              ["impression", "綜合印象"],
                            ].map(([k, l]) => (
                              <Field label={l} key={k}>
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  required
                                  value={d[k]}
                                  onChange={(e) =>
                                    setScoreDraft({
                                      ...scoreDraft,
                                      [c.id]: {
                                        ...d,
                                        [k]: Number(e.target.value),
                                      },
                                    })
                                  }
                                />
                              </Field>
                            ))}
                          </div>
                          <div className="form-actions">
                            <button
                              className="small-button"
                              type="button"
                              onClick={() =>
                                run(async () => {
                                  await api("save-score", {
                                    activity_id: chosen,
                                    contestant_id: c.id,
                                    scores: d,
                                    version: saved?.version,
                                    submitted: false,
                                  });
                                  await onSaved();
                                  setNotice("評分草稿已儲存。");
                                })
                              }
                            >
                              儲存草稿
                            </button>
                            <button className="button dark">
                              <Send size={15} />
                              正式送出
                            </button>
                          </div>
                        </fieldset>
                      </form>
                    );
                  })
              ) : (
                <p>
                  您尚未被指派為此場評審；主辦可在上方指派已加入的專案成員。
                </p>
              )}
              {manage && (
                <button
                  className="button dark"
                  disabled={busy}
                  onClick={() => {
                    if (
                      confirm(
                        "確認所有評審已送出評分、參賽者同意公開，並發布計算結果？",
                      )
                    )
                      run(async () => {
                        await api("publish-results", {
                          activity_id: chosen,
                          results_confirmed: true,
                        });
                        await onSaved();
                        setNotice("成績已確認並公開。");
                      });
                  }}
                >
                  確認並發布成績
                </button>
              )}
            </section>
          )}
        </>
      )}
      {tab === "checkin" && (
        <>
          <TicketCheckin projectId={projectId} />
          <section className="panel">
            <h2>免費活動報到</h2>
            {registrations
              .filter((r: Doc) => ["approved", "attended"].includes(r.status))
              .map((r: Doc) => (
                <div className="list-row" key={r.id}>
                  <div>
                    <h3>{r.profile?.name || "報名會員"}</h3>
                    <p>{r.activity?.title}</p>
                  </div>
                  <Badge status={r.status} />
                  {r.status === "approved" && (
                    <button
                      className="small-button"
                      disabled={busy}
                      onClick={() =>
                        run(async () => {
                          await api("review-registration", {
                            id: r.id,
                            status: "attended",
                          });
                          await onSaved();
                        })
                      }
                    >
                      確認報到
                    </button>
                  )}
                </div>
              ))}
          </section>
        </>
      )}
      {modal && (
        <RecordEditor
          type={modal.type}
          initial={modal.initial}
          projectId={projectId}
          readonly={!canEdit}
          onClose={() => setModal(null)}
          onSaved={onSaved}
        />
      )}
    </>
  );
}
export function TicketCheckin({ projectId }: { projectId: string }) {
  const [token, setToken] = useState(""),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [camera, setCamera] = useState(false);
  const video = useRef<HTMLVideoElement>(null),
    controls = useRef<{ stop: () => void } | null>(null);
  useEffect(() => () => controls.current?.stop(), []);
  async function startCamera() {
    setCamera(true);
    setError("");
    try {
      await new Promise((r) => setTimeout(r, 50));
      const { BrowserQRCodeReader } = await import("@zxing/browser");
      const reader = new BrowserQRCodeReader();
      controls.current = await reader.decodeFromConstraints(
        { video: { facingMode: "environment" }, audio: false },
        video.current!,
        (result) => {
          if (result) {
            setToken(result.getText());
            controls.current?.stop();
            setCamera(false);
          }
        },
      );
    } catch {
      setCamera(false);
      setError("無法啟用相機，請允許相機權限，或使用掃描器／貼上票券QR內容。");
    }
  }
  return (
    <section className="panel">
      <h2>票券現場核銷</h2>
      <p>
        可開啟手機相機讀碼，或使用掃描器輸入。讀取後仍需確認核銷，重複或退款保留票券會被拒絕。
      </p>
      {error && (
        <div className="alert" role="alert">
          {error}
        </div>
      )}
      {notice && (
        <div className="notice" role="status">
          {notice}
        </div>
      )}
      {camera && (
        <video
          ref={video}
          muted
          playsInline
          style={{ width: "100%", maxHeight: 330, background: "#222" }}
          aria-label="本機票券掃描相機"
        />
      )}
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          setNotice("");
          try {
            const d = await api("checkin", { token, project_id: projectId });
            setNotice("核銷成功：" + d.result.ticket_no);
            setToken("");
          } catch (err) {
            setError((err as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <Field label="票券QR內容">
          <input
            required
            value={token}
            onChange={(e) => setToken(e.target.value)}
            autoComplete="off"
          />
        </Field>
        <div className="form-actions">
          <button className="button dark" disabled={busy || !token}>
            <Check size={15} />
            確認核銷
          </button>
          <button
            className="small-button"
            type="button"
            onClick={
              camera
                ? () => {
                    controls.current?.stop();
                    setCamera(false);
                  }
                : startCamera
            }
          >
            {camera ? <StopCircle size={15} /> : <Camera size={15} />}{" "}
            {camera ? "停止相機" : "開啟相機讀碼"}
          </button>
        </div>
      </form>
    </section>
  );
}
