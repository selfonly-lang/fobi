"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/client-api";
import {
  DEFAULT_WEBSITE,
  photoLabel,
  type WebsiteContent,
  type SitePhoto,
} from "@/lib/website-types";
import { Dialog, Field } from "./controls";
import type { Doc } from "./editors";
const fieldNames: Record<string, string> = {
  brand_name: "品牌名稱",
  headline: "首頁大標題（可換行）",
  intro: "首頁引言",
  about_heading: "年度計畫標題",
  about_body: "年度計畫說明",
  training_heading: "培訓區標題",
  training_body: "培訓區說明",
  partner_heading: "合作區標題",
  partner_body: "合作區說明",
  gallery_heading: "得獎人物與活動區標題",
  gallery_intro: "人物與活動區說明",
};
export function SiteEditor({
  projectId,
  assets,
  onClose,
  onSaved,
}: {
  projectId: string;
  assets: Doc[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [d, setD] = useState<WebsiteContent | null>(null),
    [version, setVersion] = useState(0),
    [role, setRole] = useState("viewer"),
    [tab, setTab] = useState("copy"),
    [busy, setBusy] = useState(false),
    [dirty, setDirty] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [rights, setRights] = useState(false),
    [published, setPublished] = useState("");
  const load = async () => {
    setError("");
    try {
      const r = await api("ops-site-draft", undefined, { project: projectId });
      setD(structuredClone(r.draft || DEFAULT_WEBSITE));
      setVersion(r.version);
      setRole(r.role);
      setPublished(r.published_at || "");
      setDirty(false);
      setRights(false);
    } catch (e) {
      setError((e as Error).message);
    }
  };
  useEffect(() => {
    load();
  }, [projectId]);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const edit = ["owner", "manager", "editor"].includes(role),
    publish = ["owner", "manager"].includes(role);
  const close = () => {
    if (!dirty || confirm("還有未儲存的官網內容，確定關閉？")) onClose();
  };
  const change = (next: WebsiteContent) => {
    setD(next);
    setDirty(true);
    setRights(false);
    setNotice("");
  };
  const run = async (action: string) => {
    if (!d) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const r = await api(action, {
        project_id: projectId,
        version,
        content: action === "ops-site-save" ? d : undefined,
        rights_confirmed: rights,
      });
      setVersion(r.version);
      if (r.draft) setD(r.draft);
      setPublished(r.published_at || "");
      setDirty(false);
      await onSaved();
      setNotice(
        action === "ops-site-save"
          ? "草稿已儲存，公開網站尚未變更。"
          : "已發布，台灣小姐專屬網域與平台官網入口將同步顯示同一份內容。",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="website-cms">
      <Dialog title="官網內容與照片" onClose={close}>
        <p className="site-cms-url">
          共同管理：
          <a
            href="https://misstaiwan.self.com.tw"
            target="_blank"
            rel="noopener noreferrer"
          >
            misstaiwan.self.com.tw ↗
          </a>{" "}
          ／{" "}
          <a
            href="https://pageant.self.com.tw/misstaiwan"
            target="_blank"
            rel="noopener noreferrer"
          >
            pageant.self.com.tw/misstaiwan ↗
          </a>
        </p>
        <p>
          先編輯並儲存草稿，再由主辦或專案經理確認發布。得獎佳麗可排在相簿前方；姓名、名次與屆別請填入有來源可核對的圖說。
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
        {!d ? (
          <>
            <p>正在讀取官網設定…</p>
            {error && (
              <button className="small-button" onClick={load}>
                重新載入
              </button>
            )}
          </>
        ) : (
          <>
            <div className="site-cms-toolbar">
              <span className="badge">
                {dirty ? "有未儲存變更" : "草稿已載入"}
              </span>
              <small>
                {published
                  ? "上次發布：" +
                    new Date(published).toLocaleString("zh-TW", {
                      timeZone: "Asia/Taipei",
                    })
                  : "尚未由後台發布"}
              </small>
              <button
                className="small-button"
                disabled={busy}
                onClick={() => {
                  if (
                    !dirty ||
                    confirm("重新載入會放棄尚未儲存的修改，是否繼續？")
                  )
                    load();
                }}
              >
                重新載入
              </button>
            </div>
            <div className="site-cms-tabs" role="group" aria-label="官網編輯區">
              {[
                ["copy", "文字與標題"],
                ["hero", "首頁與培訓配圖"],
                ["gallery", "得獎佳麗與活動相簿"],
              ].map(([id, label]) => (
                <button
                  className={"small-button " + (tab === id ? "active" : "")}
                  aria-pressed={tab === id}
                  key={id}
                  onClick={() => setTab(id)}
                >
                  {label}
                </button>
              ))}
            </div>
            <fieldset
              disabled={!edit || busy}
              style={{ border: 0, padding: 0, minWidth: 0 }}
            >
              {tab === "copy" && (
                <>
                  <div className="form-grid">
                    {Object.entries(fieldNames).map(([key, label]) => (
                      <Field
                        key={key}
                        label={label}
                        wide={[
                          "about_body",
                          "training_body",
                          "partner_body",
                          "gallery_intro",
                        ].includes(key)}
                      >
                        {key === "brand_name" ? (
                          <input
                            value={d[key as keyof WebsiteContent] as string}
                            maxLength={120}
                            onChange={(e) =>
                              change({ ...d, [key]: e.target.value })
                            }
                          />
                        ) : (
                          <textarea
                            rows={key.endsWith("body") ? 4 : 3}
                            value={d[key as keyof WebsiteContent] as string}
                            maxLength={key.endsWith("body") ? 1500 : 600}
                            onChange={(e) =>
                              change({ ...d, [key]: e.target.value })
                            }
                          />
                        )}
                      </Field>
                    ))}
                  </div>
                  <div className="site-cms-preview">
                    <span className="eyebrow">主視覺文字預覽 · 未發布草稿</span>
                    <h3>{d.headline}</h3>
                    <p>{d.intro}</p>
                    <small>
                      賽程與課程的日期、資格及費用，仍從「活動與人員」設定。
                    </small>
                  </div>
                </>
              )}
              {tab === "hero" && (
                <div className="site-cms-photos">
                  <PhotoEditor
                    title="首頁主照片"
                    value={d.hero_photo}
                    projectId={projectId}
                    assets={assets}
                    onChange={(photo) => change({ ...d, hero_photo: photo })}
                  />
                  <PhotoEditor
                    title="培訓區照片"
                    value={
                      d.training_photo ||
                      structuredClone(DEFAULT_WEBSITE.training_photo!)
                    }
                    projectId={projectId}
                    assets={assets}
                    onChange={(photo) =>
                      change({ ...d, training_photo: photo })
                    }
                  />
                </div>
              )}
              {tab === "gallery" && (
                <>
                  <div className="panel-top">
                    <h3>得獎佳麗優先排序</h3>
                    <button
                      className="small-button"
                      disabled={d.gallery.length >= 18}
                      onClick={() =>
                        change({
                          ...d,
                          gallery: [
                            ...d.gallery,
                            {
                              id: crypto.randomUUID(),
                              url: "",
                              alt: "",
                              caption: "",
                              source_url: "",
                              source_label: "",
                              year: null,
                              kind: "real",
                              focal_x: 50,
                              focal_y: 50,
                            },
                          ],
                        })
                      }
                    >
                      新增一張照片
                    </button>
                  </div>
                  {d.gallery.map((photo, i) => (
                    <div key={photo.id} className="site-gallery-entry">
                      <div className="site-cms-toolbar">
                        <b>第 {i + 1} 張</b>
                        <button
                          className="small-button"
                          disabled={i === 0}
                          onClick={() => {
                            const rows = [...d.gallery];
                            [rows[i - 1], rows[i]] = [rows[i], rows[i - 1]];
                            change({ ...d, gallery: rows });
                          }}
                        >
                          往前移
                        </button>
                        <button
                          className="small-button"
                          disabled={i === d.gallery.length - 1}
                          onClick={() => {
                            const rows = [...d.gallery];
                            [rows[i + 1], rows[i]] = [rows[i], rows[i + 1]];
                            change({ ...d, gallery: rows });
                          }}
                        >
                          往後移
                        </button>
                        <button
                          className="small-button"
                          onClick={() => {
                            if (
                              confirm("只從官網相簿移除此照片？原始檔會保留。")
                            )
                              change({
                                ...d,
                                gallery: d.gallery.filter((_, n) => n !== i),
                              });
                          }}
                        >
                          從相簿移除
                        </button>
                      </div>
                      <PhotoEditor
                        title={"人物／活動照片 " + (i + 1)}
                        compact
                        value={photo}
                        projectId={projectId}
                        assets={assets}
                        onChange={(next) =>
                          change({
                            ...d,
                            gallery: d.gallery.map((x, n) =>
                              n === i ? next : x,
                            ),
                          })
                        }
                      />
                    </div>
                  ))}
                </>
              )}
            </fieldset>
            {publish && (
              <label className="checkbox-field">
                <input
                  type="checkbox"
                  checked={rights}
                  disabled={dirty || busy}
                  onChange={(e) => setRights(e.target.checked)}
                />
                我已確認本次照片人物、活動年份、來源與使用範圍，並核對得獎姓名及名次；AI示意與實拍已分開標示。
              </label>
            )}
            <div className="site-cms-actions">
              <button
                className="button dark"
                disabled={!edit || busy || !dirty}
                onClick={() => run("ops-site-save")}
              >
                {busy ? "處理中…" : "儲存草稿"}
              </button>
              {publish && (
                <button
                  className="button dark"
                  disabled={busy || dirty || !rights}
                  onClick={() => run("ops-site-publish")}
                >
                  確認發布至兩個官網入口
                </button>
              )}
              <button className="small-button" disabled={busy} onClick={close}>
                關閉
              </button>
            </div>
          </>
        )}
      </Dialog>
    </div>
  );
}
function PhotoEditor({
  title,
  value,
  projectId,
  assets,
  onChange,
  compact = false,
}: {
  compact?: boolean;
  title: string;
  value: SitePhoto;
  projectId: string;
  assets: Doc[];
  onChange: (p: SitePhoto) => void;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [preview, setPreview] = useState("");
  useEffect(() => {
    setPreview("");
    try {
      const u = new URL(value.url, "https://pageant.self.com.tw");
      if (u.pathname === "/api/news" && u.searchParams.get("path"))
        api("asset-preview", { path: u.searchParams.get("path") })
          .then((r) => setPreview(r.url))
          .catch(() => null);
    } catch {}
  }, [value.url]);
  const set = (key: string, v: unknown) => onChange({ ...value, [key]: v });
  const bank = [DEFAULT_WEBSITE.hero_photo, ...DEFAULT_WEBSITE.gallery].filter(
    (p, i, arr) => arr.findIndex((x) => x.id === p.id) === i,
  );
  return (
    <section className="site-photo-editor">
      <h3>{title}</h3>
      {error && (
        <div className="alert" role="alert">
          {error}
        </div>
      )}
      {value.url && (
        <>
          <img
            src={preview || value.url}
            alt={value.alt || "尚未填寫替代文字"}
          />
          <small>{photoLabel(value)} · 顯示原始構圖，網站依焦點排版</small>
        </>
      )}
      <details open={!compact} className="site-photo-fields">
        <summary>編輯照片、圖說與來源</summary>
        <fieldset
          disabled={busy}
          style={{ border: 0, padding: 0, minWidth: 0 }}
        >
          <Field label={title + "｜從已核對照片選用"}>
            <select
              value=""
              onChange={(e) => {
                const p = bank.find((p) => p.id === e.target.value);
                if (p) onChange({ ...structuredClone(p), id: value.id });
              }}
            >
              <option value="">選擇歷屆實拍</option>
              {bank.map((p) => (
                <option value={p.id} key={p.id}>
                  {p.caption.slice(0, 55)}
                </option>
              ))}
            </select>
          </Field>
          {assets.length > 0 && (
            <Field label={title + "｜從專案素材庫選用"}>
              <select
                value=""
                onChange={(e) => {
                  const a = assets.find((a) => a.id === e.target.value);
                  if (a)
                    onChange({
                      ...value,
                      url:
                        "/api/news?action=image&path=" +
                        encodeURIComponent(a.object_path),
                      alt: a.caption || "",
                      caption: a.caption || "",
                      source_label: a.source || "",
                      source_url: "",
                      year: null,
                      kind: "real",
                    });
                }}
              >
                <option value="">選擇已上傳素材（帳務憑證不可公開）</option>
                {assets.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.filename}
                  </option>
                ))}
              </select>
            </Field>
          )}
          <Field label={title + "｜上傳新照片"}>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={busy}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setBusy(true);
                setError("");
                try {
                  if (
                    !["image/jpeg", "image/png", "image/webp"].includes(
                      file.type,
                    ) ||
                    file.size > 12582912
                  )
                    throw Error("請使用12MB以內的JPG、PNG或WebP");
                  const a = await api("asset-upload", {
                    project_id: projectId,
                    filename: file.name,
                    mime: file.type,
                    bytes: file.size,
                    caption: value.caption,
                    source: value.source_label,
                  });
                  const r = await fetch(a.url, {
                    method: "PUT",
                    headers: { "Content-Type": file.type },
                    body: file,
                  });
                  if (!r.ok) throw Error("照片尚未上傳完成，請重新選擇檔案");
                  onChange({ ...value, url: a.public_url });
                  const p = await api("asset-preview", { id: a.asset.id });
                  setPreview(p.url);
                } catch (err) {
                  setError((err as Error).message);
                } finally {
                  setBusy(false);
                  e.target.value = "";
                }
              }}
            />
          </Field>
          <Field label={title + "｜圖片網址"}>
            <input
              value={value.url}
              maxLength={2000}
              onChange={(e) => set("url", e.target.value)}
            />
          </Field>
          <Field label={title + "｜替代文字"}>
            <input
              value={value.alt}
              maxLength={300}
              onChange={(e) => set("alt", e.target.value)}
            />
          </Field>
          <Field label={title + "｜姓名、獎項及活動圖說"}>
            <textarea
              rows={3}
              value={value.caption}
              maxLength={1000}
              onChange={(e) => set("caption", e.target.value)}
            />
          </Field>
          <div className="form-grid">
            <Field label={title + "｜影像類型"}>
              <select
                value={value.kind}
                onChange={(e) => set("kind", e.target.value)}
              >
                <option value="real">真實人物／活動照片</option>
                <option value="ai">AI形象示意</option>
              </select>
            </Field>
            <Field label={title + "｜原始年份"}>
              <input
                type="number"
                min={1900}
                max={2200}
                value={value.year ?? ""}
                onChange={(e) =>
                  set("year", e.target.value ? Number(e.target.value) : null)
                }
              />
            </Field>
          </div>
          <Field label={title + "｜來源名稱"}>
            <input
              value={value.source_label}
              maxLength={300}
              onChange={(e) => set("source_label", e.target.value)}
            />
          </Field>
          <Field label={title + "｜原始相片／報導連結"}>
            <input
              type="url"
              value={value.source_url}
              maxLength={1500}
              onChange={(e) => set("source_url", e.target.value)}
            />
          </Field>
          <div className="form-grid">
            <Field label={title + "｜水平焦點（0–100）"}>
              <input
                type="range"
                min={0}
                max={100}
                value={value.focal_x}
                onChange={(e) => set("focal_x", Number(e.target.value))}
              />
            </Field>
            <Field label={title + "｜垂直焦點（0–100）"}>
              <input
                type="range"
                min={0}
                max={100}
                value={value.focal_y}
                onChange={(e) => set("focal_y", Number(e.target.value))}
              />
            </Field>
          </div>
        </fieldset>
      </details>
      {busy && <p role="status">照片上傳中，請完成後再儲存草稿。</p>}
    </section>
  );
}
