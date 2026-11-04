"use client";
import { useEffect, useState } from "react";
import { Plus, ArrowUpRight, X, Copy } from "lucide-react";
import { api } from "@/lib/client-api";
import { Dialog, Field, Badge, stages } from "./controls";
import { statusLabel } from "@/lib/domain";
export type Doc = Record<string, any>;
export function RecordEditor({
  type,
  initial,
  projectId,
  readonly = false,
  assets = [],
  items = [],
  members = [],
  onClose,
  onSaved,
}: {
  type: string;
  initial: Doc;
  projectId: string;
  readonly?: boolean;
  assets?: Doc[];
  items?: Doc[];
  members?: Doc[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [d, setD] = useState<Doc>(structuredClone(initial)),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const set = (k: string, v: unknown) => setD({ ...d, [k]: v }),
    payload = (k: string, v: unknown) =>
      setD({ ...d, payload: { ...d.payload, [k]: v } });
  const labels: Record<string, string> = {
    item: "工作項目",
    activity: "子活動／課程",
    proposal: "提案與合作文件",
    media: "BeautyTV 影片",
    publication: "電子會刊",
    expense: "支出與金流費",
    project: "專案設定",
    contestant: "佳麗介紹",
  };
  const save = async () => {
    setBusy(true);
    setError("");
    try {
      let action = "",
        data: Doc = { ...d, project_id: projectId },
        legacy = false;
      if (type === "item") {
        action = "save-item";
        legacy = true;
        data = { kind: "task", stage: "planning", status: "todo", ...data };
      }
      if (type === "activity") action = "save-activity";
      if (type === "proposal") {
        action = "save-proposal";
        data.content = {
          ...d.content,
          body:
            d.content?.body ??
            d.content?.sections
              ?.map((s: Doc) => s.heading + "\n" + s.paragraphs?.join("\n\n"))
              .join("\n\n") ??
            "",
        };
      }
      if (type === "media") action = "save-media";
      if (type === "publication") {
        action = "save-publication";
        data.chapters = d.chapters || [];
      }
      if (type === "expense") {
        action = "add-expense";
        data.amount = Number(d.amount);
      }
      if (type === "project") {
        action = "save-project";
        legacy = true;
        data = {
          ...d,
          public: d.public === true,
          slug: initial.slug,
          domain: initial.domain || "",
        };
      }
      if (type === "contestant") action = "save-contestant";
      await api(action, data, {}, legacy);
      await onSaved();
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const localDate = (value: string) =>
    value
      ? new Date(
          new Date(value).getTime() - new Date().getTimezoneOffset() * 60000,
        )
          .toISOString()
          .slice(0, 16)
      : "";
  return (
    <Dialog title={labels[type] || "編輯資料"} onClose={onClose}>
      {error && (
        <div className="alert" role="alert">
          {error}
        </div>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <fieldset disabled={readonly || busy}>
          {type !== "expense" && (
            <Field label={type === "contestant" ? "姓名" : "名稱／標題"}>
              <input
                required
                maxLength={200}
                value={d.title ?? d.name ?? ""}
                onChange={(e) =>
                  set(type === "contestant" ? "name" : "title", e.target.value)
                }
              />
            </Field>
          )}
          {type === "item" && (
            <>
              <div className="form-grid">
                <Field label="工作分類">
                  <select
                    value={d.kind || "task"}
                    onChange={(e) => set("kind", e.target.value)}
                  >
                    {[
                      ["task", "流程任務"],
                      ["recruitment", "佳麗招募"],
                      ["training", "培訓紀錄"],
                      ["sponsor", "贊助交付"],
                      ["media", "媒體紀錄"],
                      ["schedule", "現場日程"],
                      ["closeout", "結案交付"],
                    ].map(([k, l]) => (
                      <option key={k} value={k}>
                        {l}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="執行階段">
                  <select
                    value={d.stage || "planning"}
                    onChange={(e) => set("stage", e.target.value)}
                  >
                    {stages.map(([k, l]) => (
                      <option key={k} value={k}>
                        {l}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="狀態">
                  <select
                    value={d.status || "todo"}
                    onChange={(e) => set("status", e.target.value)}
                  >
                    {["todo", "doing", "blocked", "done", "cancelled"].map(
                      (k) => (
                        <option key={k} value={k}>
                          {statusLabel[k]}
                        </option>
                      ),
                    )}
                  </select>
                </Field>
                <Field label="期限（瀏覽器時區）">
                  <input
                    type="datetime-local"
                    value={localDate(d.due_at)}
                    onChange={(e) =>
                      set(
                        "due_at",
                        e.target.value
                          ? new Date(e.target.value).toISOString()
                          : null,
                      )
                    }
                  />
                </Field>
              </div>
              <Field label="負責成員">
                <select
                  value={d.assigned_to || ""}
                  onChange={(e) => set("assigned_to", e.target.value || null)}
                >
                  <option value="">尚未指派</option>
                  {members.map((m: Doc, i: number) => (
                    <option key={m.user_id} value={m.user_id}>
                      {m.name || "團隊成員 " + (i + 1)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="先完成的相依工作（可複選）">
                <select
                  multiple
                  value={d.payload?.dependencies || []}
                  onChange={(e) =>
                    payload(
                      "dependencies",
                      Array.from(e.target.selectedOptions, (o) => o.value),
                    )
                  }
                >
                  {items
                    .filter((i) => i.id !== d.id)
                    .map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.title}
                      </option>
                    ))}
                </select>
              </Field>
              {d.kind === "sponsor" && (
                <>
                  <Field label="企業／品牌">
                    <input
                      value={d.payload?.company || ""}
                      onChange={(e) => payload("company", e.target.value)}
                    />
                  </Field>
                  <Field label="合作窗口">
                    <input
                      value={d.payload?.contact || ""}
                      onChange={(e) => payload("contact", e.target.value)}
                    />
                  </Field>
                  <Field label="承諾權益與交付成果">
                    <textarea
                      rows={4}
                      value={d.payload?.deliverables || ""}
                      onChange={(e) => payload("deliverables", e.target.value)}
                    />
                  </Field>
                </>
              )}
              <Field label="執行說明、進度與成果連結">
                <textarea
                  rows={5}
                  value={d.payload?.note || ""}
                  onChange={(e) => payload("note", e.target.value)}
                />
              </Field>
              <Field label="檢查清單（每行一項，完成項以 [x] 開頭）">
                <textarea
                  rows={4}
                  value={(d.payload?.checklist || [])
                    .map((x: Doc) => (x.done ? "[x] " : "[ ] ") + x.title)
                    .join("\n")}
                  onChange={(e) =>
                    payload(
                      "checklist",
                      e.target.value
                        .split("\n")
                        .filter(Boolean)
                        .map((x) => ({
                          done: x.startsWith("[x]"),
                          title: x.replace(/^\[[x ]\] ?/, ""),
                        })),
                    )
                  }
                />
              </Field>
            </>
          )}
          {type === "activity" && (
            <>
              <div className="form-grid">
                <Field label="活動類型">
                  <select
                    value={d.kind || "pageant"}
                    onChange={(e) => set("kind", e.target.value)}
                  >
                    {[
                      ["pageant", "賽事／招募"],
                      ["course", "課程"],
                      ["training", "訓練"],
                      ["press", "記者會"],
                      ["segment", "單項比賽"],
                      ["final", "總決賽"],
                      ["party", "晚宴／慶功活動"],
                    ].map(([k, l]) => (
                      <option key={k} value={k}>
                        {l}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="狀態">
                  <select
                    value={d.status || "draft"}
                    onChange={(e) => set("status", e.target.value)}
                  >
                    {[
                      "draft",
                      "pending",
                      "open",
                      "closed",
                      "cancelled",
                      "archived",
                    ].map((k) => (
                      <option key={k} value={k}>
                        {statusLabel[k]}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="開始（瀏覽器時區）">
                  <input
                    type="datetime-local"
                    value={localDate(d.starts_at)}
                    onChange={(e) =>
                      set(
                        "starts_at",
                        e.target.value
                          ? new Date(e.target.value).toISOString()
                          : null,
                      )
                    }
                  />
                </Field>
                <Field label="結束（瀏覽器時區）">
                  <input
                    type="datetime-local"
                    value={localDate(d.ends_at)}
                    onChange={(e) =>
                      set(
                        "ends_at",
                        e.target.value
                          ? new Date(e.target.value).toISOString()
                          : null,
                      )
                    }
                  />
                </Field>
                <Field label="活動顯示時區">
                  <input
                    value={d.timezone || "Asia/Taipei"}
                    onChange={(e) => set("timezone", e.target.value)}
                  />
                </Field>
                <Field label="地點">
                  <input
                    value={d.venue || ""}
                    onChange={(e) => set("venue", e.target.value)}
                  />
                </Field>
                <Field label="名額（0表示不限制）">
                  <input
                    type="number"
                    min={0}
                    value={d.capacity || 0}
                    onChange={(e) => set("capacity", Number(e.target.value))}
                  />
                </Field>
                <Field label="每人金額（NT$，0為免費報名）">
                  <input
                    type="number"
                    min={0}
                    value={d.amount || 0}
                    onChange={(e) => set("amount", Number(e.target.value))}
                  />
                </Field>
                <Field label="成交類別">
                  <select
                    value={d.fee_kind || "ticket"}
                    onChange={(e) => set("fee_kind", e.target.value)}
                  >
                    <option value="ticket">票券</option>
                    <option value="course">課程</option>
                    <option value="sponsor">贊助方案</option>
                  </select>
                </Field>
              </div>
              <Field label="活動介紹">
                <textarea
                  rows={6}
                  value={d.description || ""}
                  onChange={(e) => set("description", e.target.value)}
                />
              </Field>
              <Field label="活動／贊助條款">
                <textarea
                  rows={4}
                  value={d.terms || ""}
                  onChange={(e) => set("terms", e.target.value)}
                />
              </Field>
              <Field label="取消與退款規則">
                <textarea
                  rows={4}
                  value={d.refund_policy || ""}
                  onChange={(e) => set("refund_policy", e.target.value)}
                />
              </Field>
              <p className="muted">
                專案需通過審核並完成日期及條款，才可開放報名。收費活動另須完成正式金流及抽成設定。
              </p>
            </>
          )}
          {type === "proposal" && (
            <>
              <div className="form-grid">
                <Field label="文件類型">
                  <select
                    value={d.kind || "proposal"}
                    onChange={(e) => set("kind", e.target.value)}
                  >
                    <option value="proposal">活動企劃／提案</option>
                    <option value="sponsor">贊助方案／合作提案</option>
                    <option value="report">結案報告</option>
                  </select>
                </Field>
                <Field label="狀態">
                  <select
                    value={d.status || "draft"}
                    onChange={(e) => set("status", e.target.value)}
                  >
                    {[
                      "draft",
                      "review",
                      "approved",
                      "accepted",
                      "delivered",
                    ].map((k) => (
                      <option key={k} value={k}>
                        {statusLabel[k]}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="規劃預算／合作金額（NT$）">
                  <input
                    type="number"
                    min={0}
                    value={d.content?.budget || ""}
                    onChange={(e) =>
                      set("content", {
                        ...d.content,
                        budget: Number(e.target.value),
                      })
                    }
                  />
                </Field>
                <Field label="合作窗口">
                  <input
                    value={d.content?.contact || ""}
                    onChange={(e) =>
                      set("content", { ...d.content, contact: e.target.value })
                    }
                  />
                </Field>
              </div>
              <Field label="企劃、提案與報告內容">
                <textarea
                  rows={14}
                  value={
                    d.content?.body ??
                    d.content?.sections
                      ?.map(
                        (s: Doc) =>
                          s.heading + "\n" + s.paragraphs?.join("\n\n"),
                      )
                      .join("\n\n") ??
                    ""
                  }
                  onChange={(e) =>
                    set("content", { ...d.content, body: e.target.value })
                  }
                />
              </Field>
              <Field label="承諾權益與交付清單">
                <textarea
                  rows={4}
                  value={d.content?.deliverables || ""}
                  onChange={(e) =>
                    set("content", {
                      ...d.content,
                      deliverables: e.target.value,
                    })
                  }
                />
              </Field>
              <Field label="合約／確認紀錄網址">
                <input
                  type="url"
                  value={d.content?.contract_url || ""}
                  onChange={(e) =>
                    set("content", {
                      ...d.content,
                      contract_url: e.target.value,
                    })
                  }
                />
              </Field>
            </>
          )}
          {type === "media" && (
            <>
              <div className="form-grid">
                <Field label="影片分類">
                  <select
                    value={d.kind || "highlight"}
                    onChange={(e) => set("kind", e.target.value)}
                  >
                    {[
                      ["short", "短影音"],
                      ["interview", "人物專訪"],
                      ["highlight", "活動回顧"],
                      ["show", "完整節目"],
                    ].map(([k, l]) => (
                      <option key={k} value={k}>
                        {l}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="影片來源">
                  <select
                    disabled={d.provider === "self"}
                    value={d.provider || "youtube"}
                    onChange={(e) => set("provider", e.target.value)}
                  >
                    <option value="youtube">YouTube</option>
                    <option value="vimeo">Vimeo</option>
                    <option value="cloudflare">
                      自有影片（Cloudflare Stream）
                    </option>
                    {d.provider === "self" && (
                      <option value="self">既有專案影片</option>
                    )}
                  </select>
                </Field>
                <Field label="影片識別碼">
                  <input
                    required
                    disabled={d.provider === "self"}
                    value={d.external_id || ""}
                    onChange={(e) => set("external_id", e.target.value)}
                    placeholder="YouTube 影片網址 v= 後的識別碼"
                  />
                </Field>
                <Field label="狀態">
                  <select
                    value={
                      ["draft", "review"].includes(d.status)
                        ? d.status
                        : "draft"
                    }
                    onChange={(e) => set("status", e.target.value)}
                  >
                    <option value="draft">草稿</option>
                    <option value="review">送審</option>
                  </select>
                </Field>
              </div>
              <Field label="內容介紹">
                <textarea
                  rows={4}
                  value={d.description || ""}
                  onChange={(e) => set("description", e.target.value)}
                />
              </Field>
              <Field label="封面圖片網址">
                <input
                  value={d.poster || ""}
                  onChange={(e) => set("poster", e.target.value)}
                />
              </Field>
              <Field label="圖說／字幕與製作資訊">
                <textarea
                  rows={3}
                  value={d.caption || ""}
                  onChange={(e) => set("caption", e.target.value)}
                />
              </Field>
              <Field label="原始來源網址">
                <input
                  required
                  value={d.source || ""}
                  onChange={(e) => set("source", e.target.value)}
                />
              </Field>
              <label className="checkbox-field">
                <input
                  type="checkbox"
                  checked={d.rights_confirmed || false}
                  onChange={(e) => set("rights_confirmed", e.target.checked)}
                />
                我已確認這段影片及封面的使用授權。
              </label>
              {d.provider === "self" && (
                <p className="muted">
                  既有專案影片保留原始來源；可由審核操作下架，不在此更換來源。
                </p>
              )}
            </>
          )}
          {type === "publication" && (
            <>
              <Field label="會刊代稱（小寫英文／數字）">
                <input
                  required
                  disabled={!!d.id}
                  value={d.slug || ""}
                  onChange={(e) => set("slug", e.target.value)}
                  pattern="[a-z0-9][a-z0-9-]{1,119}"
                />
              </Field>
              <Field label="會刊介紹">
                <textarea
                  rows={3}
                  value={d.description || ""}
                  onChange={(e) => set("description", e.target.value)}
                />
              </Field>
              {(d.chapters || []).map((c: Doc, i: number) => (
                <section className="editor-section" key={i}>
                  <div className="panel-top">
                    <b>章節 {i + 1}</b>
                    <button
                      className="small-button"
                      type="button"
                      onClick={() =>
                        set(
                          "chapters",
                          d.chapters.filter((_: Doc, n: number) => n !== i),
                        )
                      }
                    >
                      移除
                    </button>
                  </div>
                  <Field label="章節標題">
                    <input
                      value={c.heading}
                      onChange={(e) =>
                        set(
                          "chapters",
                          d.chapters.map((x: Doc, n: number) =>
                            n === i ? { ...x, heading: e.target.value } : x,
                          ),
                        )
                      }
                    />
                  </Field>
                  <Field label="章節內文（空行分段）">
                    <textarea
                      rows={7}
                      value={c.paragraphs?.join("\n\n") || ""}
                      onChange={(e) =>
                        set(
                          "chapters",
                          d.chapters.map((x: Doc, n: number) =>
                            n === i
                              ? {
                                  ...x,
                                  paragraphs: e.target.value.split("\n\n"),
                                }
                              : x,
                          ),
                        )
                      }
                    />
                  </Field>
                  <Field label="已核准的圖片網址">
                    <input
                      value={c.photo || ""}
                      onChange={(e) =>
                        set(
                          "chapters",
                          d.chapters.map((x: Doc, n: number) =>
                            n === i ? { ...x, photo: e.target.value } : x,
                          ),
                        )
                      }
                    />
                  </Field>
                  <Field label="圖說及來源">
                    <input
                      value={c.caption || ""}
                      onChange={(e) =>
                        set(
                          "chapters",
                          d.chapters.map((x: Doc, n: number) =>
                            n === i ? { ...x, caption: e.target.value } : x,
                          ),
                        )
                      }
                    />
                  </Field>
                </section>
              ))}
              <button
                type="button"
                className="small-button"
                onClick={() =>
                  set("chapters", [
                    ...(d.chapters || []),
                    { heading: "", paragraphs: [] },
                  ])
                }
              >
                <Plus size={14} />
                新增章節
              </button>
              <p className="muted">
                儲存為草稿不會變動原公開版本；會刊只可引用已核准公開的內容。
              </p>
            </>
          )}
          {type === "expense" && (
            <>
              <Field label="支出類型">
                <select
                  value={d.kind || "expense"}
                  onChange={(e) => set("kind", e.target.value)}
                >
                  <option value="expense">活動支出</option>
                  <option value="gateway_fee">實際金流費</option>
                </select>
              </Field>
              <Field label="金額（NT$）">
                <input
                  type="number"
                  min={1}
                  required
                  value={d.amount || ""}
                  onChange={(e) => set("amount", Number(e.target.value))}
                />
              </Field>
              <Field label="用途與歸屬說明">
                <textarea
                  rows={4}
                  required
                  value={d.description || ""}
                  onChange={(e) => set("description", e.target.value)}
                />
              </Field>
              <Field label="支出憑證（先於素材庫上傳圖片）">
                <select
                  value={d.proof_asset_id || ""}
                  onChange={(e) => set("proof_asset_id", e.target.value)}
                >
                  <option value="">尚未指定</option>
                  {assets.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.filename}
                    </option>
                  ))}
                </select>
              </Field>
              <p className="muted">
                支出將記入專案收支並影響待結算餘額，請先確認費用歸屬與實際憑證。
              </p>
            </>
          )}
          {type === "project" && (
            <>
              <div className="form-grid">
                <Field label="年度">
                  <input value={d.year || ""} disabled />
                </Field>
                <Field label="專案狀態">
                  <select
                    disabled={initial.slug === "fobi-2026"}
                    value={d.status}
                    onChange={(e) => set("status", e.target.value)}
                  >
                    {[
                      "planning",
                      "recruiting",
                      "active",
                      "closed",
                      "archived",
                    ].map((k) => (
                      <option key={k} value={k}>
                        {statusLabel[k]}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="活動日期">
                  <input
                    type="date"
                    value={d.event_date || ""}
                    onChange={(e) => set("event_date", e.target.value)}
                  />
                </Field>
                <Field label="場地">
                  <input
                    value={d.venue || ""}
                    onChange={(e) => set("venue", e.target.value)}
                  />
                </Field>
              </div>
              <Field label="專案介紹">
                <textarea
                  rows={5}
                  value={d.summary || ""}
                  onChange={(e) => set("summary", e.target.value)}
                />
              </Field>
              <p className="muted">
                品牌網址及公開審核由平台管理。FOBI 2026
                保持結案狀態，後續年度請另建專案。
              </p>
            </>
          )}
          {type === "contestant" && (
            <>
              <div className="form-grid">
                <Field label="國家／地區">
                  <input
                    value={d.country || ""}
                    onChange={(e) => set("country", e.target.value)}
                    maxLength={100}
                  />
                </Field>
                <Field label="介紹狀態">
                  <select
                    value={d.status || "draft"}
                    onChange={(e) => set("status", e.target.value)}
                  >
                    <option value="draft">草稿</option>
                    <option value="approved">已確認</option>
                    <option value="rejected">不公開</option>
                  </select>
                </Field>
              </div>
              <Field label="人物介紹">
                <textarea
                  rows={5}
                  value={d.bio || ""}
                  onChange={(e) => set("bio", e.target.value)}
                  maxLength={5000}
                />
              </Field>
              <Field label="已授權人物照片網址">
                <input
                  value={d.photo || ""}
                  onChange={(e) => set("photo", e.target.value)}
                />
              </Field>
              <label className="checkbox-field">
                <input
                  type="checkbox"
                  checked={d.public_consent || false}
                  onChange={(e) => set("public_consent", e.target.checked)}
                />
                已取得本人公開姓名、介紹及照片的同意。
              </label>
            </>
          )}
        </fieldset>
        <div className="modal-actions">
          <button type="button" className="button outline" onClick={onClose}>
            關閉
          </button>
          {!readonly && d.provider !== "self" && (
            <button className="button dark" disabled={busy}>
              {busy ? "正在儲存…" : "儲存"}
            </button>
          )}
        </div>
      </form>
    </Dialog>
  );
}
const emptyNews = () => ({
  title: "",
  subtitle: "",
  byline: "SELF PAGEANT 編輯室",
  category: "賽事新聞",
  partner: "",
  topic: "",
  facts: [],
  perspective: [],
  sections: [{ heading: "", paragraphs: [] }],
  closing: [],
  photos: [],
  sources: [],
});
export function NewsEditor({
  initial,
  projectId,
  role,
  onClose,
  onSaved,
}: {
  initial: Doc;
  projectId: string | null;
  role: string;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [a, setA] = useState<Doc>({
      ...initial,
      project_id: projectId,
      content: initial.content || emptyNews(),
    }),
    [versions, setVersions] = useState<Doc[]>(initial.versions || []),
    [tab, setTab] = useState("content"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [dirty, setDirty] = useState(false),
    [when, setWhen] = useState(""),
    [notice, setNotice] = useState("");
  const canEdit = ["owner", "manager", "editor"].includes(role),
    canReview = ["owner", "manager", "reviewer"].includes(role),
    c = a.content;
  const change = (k: string, v: unknown) => {
    setA({ ...a, content: { ...c, [k]: v } });
    setDirty(true);
  };
  const close = () => {
    if (!dirty || confirm("尚有未儲存內容，確定關閉？")) onClose();
  };
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const reload = async (id: string) => {
    const d = await api("article-get", undefined, { id });
    setA(d.article);
    setVersions(d.versions);
    setDirty(false);
    await onSaved();
  };
  const transition = (status: string) =>
    run(async () => {
      await api("article-transition", {
        id: a.id,
        version: a.version,
        status,
        ...(status === "scheduled"
          ? { publish_at: when ? new Date(when).toISOString() : null }
          : {}),
      });
      await reload(a.id);
      setNotice("新聞狀態已更新。");
    });
  const transitions: Record<string, string[]> = {
    draft: ["review"],
    review: ["draft", "approved"],
    approved: ["draft", "published", "scheduled"],
    published: ["draft", "withdrawn"],
    scheduled: ["draft", "withdrawn"],
    withdrawn: ["draft"],
  };
  return (
    <Dialog title={a.id ? "新聞編輯與發布" : "撰寫新聞"} onClose={close}>
      <div className="editor-status">
        <Badge status={a.status || "draft"} />
        <span>{a.id ? "版本 " + a.version : "新草稿"}</span>
        {dirty && <span>尚未儲存</span>}
        {a.id && (
          <a
            href={"/studio/preview?article=" + a.id}
            target="_blank"
            rel="noopener"
          >
            私人預覽 ↗
          </a>
        )}
      </div>
      <nav className="workspace-tabs">
        {[
          ["content", "新聞內文"],
          ["photos", "圖片與來源"],
          ["publish", "審核與版本"],
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
      <form
        onSubmit={(e) => {
          e.preventDefault();
          run(async () => {
            const d = await api("article-save", a);
            await reload(d.article.id);
            setNotice("草稿已儲存。");
          });
        }}
      >
        <fieldset disabled={busy || !canEdit}>
          {tab === "content" && (
            <>
              <Field label="新聞標題">
                <input
                  required
                  maxLength={240}
                  value={c.title}
                  onChange={(e) => change("title", e.target.value)}
                />
              </Field>
              <Field label="固定網址代稱（小寫英文／數字）">
                <input
                  required
                  disabled={!!a.id}
                  value={a.slug || ""}
                  onChange={(e) => {
                    setA({ ...a, slug: e.target.value });
                    setDirty(true);
                  }}
                  pattern="[a-z0-9][a-z0-9-]{1,119}"
                />
              </Field>
              <Field label="摘要／分享描述">
                <textarea
                  rows={3}
                  value={c.subtitle || ""}
                  onChange={(e) => change("subtitle", e.target.value)}
                />
              </Field>
              <div className="form-grid">
                {[
                  ["byline", "署名"],
                  ["category", "新聞分類"],
                  ["partner", "人物／品牌"],
                  ["topic", "主題"],
                ].map(([k, l]) => (
                  <Field label={l} key={k}>
                    <input
                      value={c[k] || ""}
                      onChange={(e) => change(k, e.target.value)}
                    />
                  </Field>
                ))}
              </div>
              <Field label="前言（空行分段）">
                <textarea
                  rows={4}
                  value={(c.facts || []).join("\n\n")}
                  onChange={(e) =>
                    change("facts", e.target.value.split("\n\n"))
                  }
                />
              </Field>
              {c.perspective?.length > 0 && (
                <Field label="觀點段落（空行分段）">
                  <textarea
                    rows={4}
                    value={c.perspective.join("\n\n")}
                    onChange={(e) =>
                      change("perspective", e.target.value.split("\n\n"))
                    }
                  />
                </Field>
              )}
              {c.sections.map((s: Doc, i: number) => (
                <section className="editor-section" key={i}>
                  <div className="panel-top">
                    <b>段落 {i + 1}</b>
                    <button
                      className="small-button"
                      type="button"
                      onClick={() =>
                        change(
                          "sections",
                          c.sections.filter((_: Doc, n: number) => n !== i),
                        )
                      }
                    >
                      移除
                    </button>
                  </div>
                  <Field label="段落小標">
                    <input
                      value={s.heading}
                      onChange={(e) =>
                        change(
                          "sections",
                          c.sections.map((x: Doc, n: number) =>
                            n === i ? { ...x, heading: e.target.value } : x,
                          ),
                        )
                      }
                    />
                  </Field>
                  <Field label="內文（空行分段）">
                    <textarea
                      rows={7}
                      value={s.paragraphs.join("\n\n")}
                      onChange={(e) =>
                        change(
                          "sections",
                          c.sections.map((x: Doc, n: number) =>
                            n === i
                              ? {
                                  ...x,
                                  paragraphs: e.target.value.split("\n\n"),
                                }
                              : x,
                          ),
                        )
                      }
                    />
                  </Field>
                </section>
              ))}
              <button
                className="small-button"
                type="button"
                onClick={() =>
                  change("sections", [
                    ...c.sections,
                    { heading: "", paragraphs: [] },
                  ])
                }
              >
                <Plus size={14} />
                新增段落
              </button>
              <Field label="結語（空行分段）">
                <textarea
                  rows={4}
                  value={(c.closing || []).join("\n\n")}
                  onChange={(e) =>
                    change("closing", e.target.value.split("\n\n"))
                  }
                />
              </Field>
            </>
          )}
          {tab === "photos" && (
            <>
              <p className="muted">
                第一張為封面。請使用真實、已取得授權的圖片，保留獨立圖說與來源；素材庫可上傳並複製站內圖片網址。
              </p>
              {c.photos.map((p: Doc, i: number) => (
                <section className="editor-section" key={i}>
                  <div className="panel-top">
                    <b>{i === 0 ? "封面圖片" : "報導圖片 " + (i + 1)}</b>
                    <button
                      type="button"
                      className="small-button"
                      onClick={() =>
                        change(
                          "photos",
                          c.photos.filter((_: Doc, n: number) => n !== i),
                        )
                      }
                    >
                      移除
                    </button>
                  </div>
                  {[
                    ["url", "圖片網址"],
                    ["caption", "圖說與攝影者"],
                    ["source", "圖片來源網址"],
                  ].map(([k, l]) => (
                    <Field label={l} key={k}>
                      <input
                        value={p[k] || ""}
                        onChange={(e) =>
                          change(
                            "photos",
                            c.photos.map((x: Doc, n: number) =>
                              n === i ? { ...x, [k]: e.target.value } : x,
                            ),
                          )
                        }
                      />
                    </Field>
                  ))}
                </section>
              ))}
              <button
                type="button"
                className="small-button"
                onClick={() =>
                  change("photos", [
                    ...c.photos,
                    { url: "", caption: "", source: "" },
                  ])
                }
              >
                <Plus size={14} />
                加入圖片
              </button>
              <h3>背景資料來源</h3>
              {c.sources.map((s: Doc, i: number) => (
                <div className="source-row" key={i}>
                  <input
                    className="plain-input"
                    aria-label="來源名稱"
                    placeholder="來源名稱"
                    value={s.title}
                    onChange={(e) =>
                      change(
                        "sources",
                        c.sources.map((x: Doc, n: number) =>
                          n === i ? { ...x, title: e.target.value } : x,
                        ),
                      )
                    }
                  />
                  <input
                    className="plain-input"
                    aria-label="來源網址"
                    placeholder="https://"
                    value={s.url}
                    onChange={(e) =>
                      change(
                        "sources",
                        c.sources.map((x: Doc, n: number) =>
                          n === i ? { ...x, url: e.target.value } : x,
                        ),
                      )
                    }
                  />
                  <button
                    type="button"
                    className="icon-button"
                    aria-label="移除來源"
                    onClick={() =>
                      change(
                        "sources",
                        c.sources.filter((_: Doc, n: number) => n !== i),
                      )
                    }
                  >
                    <X size={17} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="small-button"
                onClick={() =>
                  change("sources", [...c.sources, { title: "", url: "" }])
                }
              >
                <Plus size={14} />
                加入資料來源
              </button>
            </>
          )}
        </fieldset>
        {tab === "publish" && (
          <>
            <section className="panel">
              <h3>審核與發布</h3>
              <p>
                草稿 → 送審 → 核准 →
                立即發布／排程。編輯中的草稿不會取代原公開版本。
              </p>
              {dirty && (
                <div className="notice">請先儲存修改，再進行審核與發布。</div>
              )}
              <div className="form-actions">
                {(transitions[a.status || "draft"] || [])
                  .filter(
                    (s) =>
                      canReview || (["draft", "review"].includes(s) && canEdit),
                  )
                  .map((s) =>
                    s === "scheduled" ? (
                      <div key={s}>
                        <Field label="發布時間（瀏覽器時區）">
                          <input
                            type="datetime-local"
                            value={when}
                            onChange={(e) => setWhen(e.target.value)}
                          />
                        </Field>
                        <button
                          type="button"
                          className="small-button"
                          disabled={busy || dirty || !a.id || !when}
                          onClick={() => transition(s)}
                        >
                          排程發布
                        </button>
                      </div>
                    ) : (
                      <button
                        className="small-button"
                        type="button"
                        key={s}
                        disabled={busy || dirty || !a.id}
                        onClick={() => {
                          if (
                            s !== "withdrawn" ||
                            confirm(
                              "下架後，公開連結將不再顯示這篇報導。確定下架？",
                            )
                          )
                            transition(s);
                        }}
                      >
                        {
                          {
                            draft: "退回草稿",
                            review: "送出審核",
                            approved: "核准",
                            published: "立即發布",
                            withdrawn: "下架",
                          }[s]
                        }
                      </button>
                    ),
                  )}
              </div>
              {a.publish_at && (
                <p>
                  公開版本時間：{new Date(a.publish_at).toLocaleString("zh-TW")}
                </p>
              )}
              {a.scheduled_at && (
                <p>
                  排程時間：{new Date(a.scheduled_at).toLocaleString("zh-TW")}
                </p>
              )}
              {a.id && (
                <a
                  className="text-link"
                  href={"/news/" + a.slug}
                  target="_blank"
                  rel="noopener"
                >
                  查看公開新聞 ↗
                </a>
              )}
            </section>
            <section className="panel">
              <h3>版本紀錄</h3>
              {versions.map((v) => (
                <div className="list-row" key={v.id}>
                  <span>
                    v{v.version} ·{" "}
                    {new Date(v.created_at).toLocaleString("zh-TW")}
                  </span>
                  {canEdit && v.version !== a.version && (
                    <button
                      type="button"
                      className="small-button"
                      disabled={busy || dirty}
                      onClick={() => {
                        if (
                          confirm(
                            "將此版本還原為新草稿？公開內容不會立刻改變。",
                          )
                        )
                          run(async () => {
                            await api("article-restore", {
                              id: a.id,
                              version: a.version,
                              restore_version: v.version,
                            });
                            await reload(a.id);
                          });
                      }}
                    >
                      還原草稿
                    </button>
                  )}
                </div>
              ))}
            </section>
            {canReview && a.id && (
              <section className="panel">
                <h3>官網與社群渠道</h3>
                <p>
                  先發布到官網，再送至已授權的渠道。未完成授權的渠道不會代發。
                </p>
                <div className="channel-actions">
                  {[
                    ["facebook", "Facebook"],
                    ["line", "LINE 官方帳號"],
                  ].map(([channel, l]) => (
                    <button
                      key={channel}
                      type="button"
                      className="small-button"
                      disabled={busy || dirty}
                      onClick={() => {
                        if (confirm("確認將已公開新聞發送至 " + l + "？"))
                          run(async () => {
                            const d = await api("channel-publish", {
                              article_id: a.id,
                              channel,
                            });
                            setNotice(
                              d.message ||
                                (d.status === "sent"
                                  ? "此新聞已發布過，未重複發送。"
                                  : d.status === "unknown"
                                    ? "上次渠道回覆不明，請先核對官方後台，避免重複推播。"
                                    : "發布工作已在處理中。"),
                            );
                          });
                      }}
                    >
                      發布至 {l}
                    </button>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
        <div className="modal-actions">
          <button type="button" className="button outline" onClick={close}>
            關閉
          </button>
          <button
            type="button"
            className="small-button"
            onClick={() => {
              const text = [
                c.title,
                c.subtitle,
                c.byline,
                ...(c.facts || []),
                ...(c.perspective || []),
                ...c.sections.flatMap((s: Doc) => [s.heading, ...s.paragraphs]),
                ...(c.closing || []),
              ]
                .filter(Boolean)
                .join("\n\n");
              navigator.clipboard
                .writeText(text)
                .then(() => setNotice("新聞文字已複製。"))
                .catch(() =>
                  setError("瀏覽器未允許複製，請從私人預覽選取內文。"),
                );
            }}
          >
            <Copy size={14} />
            複製文稿
          </button>
          {canEdit && (
            <button className="button dark" disabled={busy}>
              {busy ? "正在儲存…" : "儲存草稿"}
            </button>
          )}
        </div>
      </form>
    </Dialog>
  );
}
