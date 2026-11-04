"use client";
import { useState } from "react";
import { Image, Upload, Copy, Trash2 } from "lucide-react";
import { api } from "@/lib/client-api";
import { Dialog, Field } from "./controls";
import type { Doc } from "./editors";
export function AssetLibrary({
  projectId,
  assets,
  canEdit,
  onSaved,
}: {
  projectId: string;
  assets: Doc[];
  canEdit: boolean;
  onSaved: () => Promise<void>;
}) {
  const [file, setFile] = useState<File | null>(null),
    [caption, setCaption] = useState(""),
    [source, setSource] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [preview, setPreview] = useState("");
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
  return (
    <>
      <section className="panel">
        <div className="panel-top">
          <h2>專案素材庫</h2>
          <span className="muted">圖片與憑證 · 12MB以內</span>
        </div>
        <p>
          上傳後先保持私人；圖片被已發布新聞或會刊引用後，才可由公開頁讀取。帳務憑證不會自動公開。
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
        {canEdit && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              run(async () => {
                if (!file) throw Error("請先選擇圖片");
                const d = await api("asset-upload", {
                  project_id: projectId,
                  filename: file.name,
                  mime: file.type,
                  bytes: file.size,
                  caption,
                  source,
                });
                const r = await fetch(d.url, {
                  method: "PUT",
                  headers: { "Content-Type": file.type },
                  body: file,
                });
                if (!r.ok) throw Error("上傳未完成，請重新選擇圖片再試");
                await onSaved();
                setFile(null);
                setCaption("");
                setSource("");
                setNotice("素材已上傳，可從列表複製圖片網址或作為帳務憑證。");
              });
            }}
          >
            <div className="form-grid">
              <Field label="圖片檔案（JPG／PNG／WebP）" wide>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  required
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
              </Field>
              <Field label="圖說／憑證說明">
                <input
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                />
              </Field>
              <Field label="來源／授權紀錄">
                <input
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                />
              </Field>
            </div>
            <button className="button dark" disabled={!file || busy}>
              <Upload size={15} />
              {busy ? "正在上傳…" : "上傳素材"}
            </button>
          </form>
        )}
      </section>
      <section className="panel">
        {assets.length ? (
          assets.map((a) => (
            <div className="list-row" key={a.id}>
              <Image size={22} />
              <div>
                <h3>{a.filename}</h3>
                <p>
                  {a.caption || "尚未填寫圖說"} · {Math.round(a.bytes / 1024)}{" "}
                  KB
                </p>
              </div>
              <button
                className="small-button"
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    const d = await api("asset-preview", { id: a.id });
                    setPreview(d.url);
                  })
                }
              >
                私人預覽
              </button>
              <button
                className="small-button"
                onClick={() =>
                  navigator.clipboard
                    .writeText(
                      "/api/news?action=image&path=" +
                        encodeURIComponent(a.object_path),
                    )
                    .then(() => setNotice("站內圖片網址已複製。"))
                    .catch(() => setError("請允許瀏覽器複製權限。"))
                }
              >
                <Copy size={13} />
                網址
              </button>
              {canEdit && (
                <button
                  className="icon-button"
                  aria-label={"刪除" + a.filename}
                  onClick={() => {
                    if (
                      confirm("移除未使用素材？被內容或帳務引用的素材將保留。")
                    )
                      run(async () => {
                        await api("asset-delete", { id: a.id });
                        await onSaved();
                        setNotice("未使用素材已移除。");
                      });
                  }}
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ))
        ) : (
          <div className="empty-public">
            <h3>尚未上傳新素材</h3>
            <p>既有 FOBI 報導照片與來源仍保留在各篇新聞中。</p>
          </div>
        )}
      </section>
      {preview && (
        <Dialog title="私人素材預覽" onClose={() => setPreview("")}>
          <img
            src={preview}
            alt="已授權的專案私人素材"
            style={{ maxHeight: "65vh", margin: "auto" }}
          />
          <p className="muted">此預覽連結限時有效。</p>
        </Dialog>
      )}
    </>
  );
}
