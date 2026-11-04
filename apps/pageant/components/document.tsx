"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/client-api";
import { PrivateImage } from "./private-image";
import { Dialog } from "./controls";
import type { Doc } from "./editors";
export function DocumentDialog({
  record,
  kind,
  canEdit,
  onSaved,
  onClose,
}: {
  record: Doc;
  kind: "proposal" | "publication";
  canEdit: boolean;
  onSaved: () => Promise<void>;
  onClose: () => void;
}) {
  const [data, setData] = useState<Doc | null>(null),
    [error, setError] = useState("");
  const load = async () =>
    setData(await api("document", undefined, { kind, id: record.id }));
  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [record.id, kind]);
  const d = data?.document;
  return (
    <Dialog title="文件預覽與版本" onClose={onClose}>
      {error && <div className="alert">{error}</div>}
      {d && (
        <>
          <div className="print-preview">
            <h1>{d.title}</h1>
            {kind === "proposal" ? (
              <p>
                {d.content.body ||
                  d.content.sections
                    ?.map(
                      (s: Doc) => s.heading + "\n" + s.paragraphs?.join("\n\n"),
                    )
                    .join("\n\n")}
              </p>
            ) : (
              d.chapters.map((c: Doc, i: number) => (
                <section key={i}>
                  <h2>{c.heading}</h2>
                  {c.photo && (
                    <PrivateImage url={c.photo} alt={c.caption || c.heading} />
                  )}
                  <p>{c.paragraphs?.join("\n\n")}</p>
                </section>
              ))
            )}
          </div>
          <div className="form-actions">
            <button className="small-button" onClick={() => window.print()}>
              列印／另存 PDF
            </button>
            <button
              className="small-button"
              onClick={() => {
                const blob = new Blob(
                    [
                      d.title +
                        "\n\n" +
                        (kind === "proposal"
                          ? d.content.body
                          : d.chapters
                              .map(
                                (c: Doc) =>
                                  c.heading + "\n" + c.paragraphs.join("\n\n"),
                              )
                              .join("\n\n")),
                    ],
                    { type: "text/plain;charset=utf-8" },
                  ),
                  u = URL.createObjectURL(blob),
                  a = document.createElement("a");
                a.href = u;
                a.download = d.title + ".txt";
                a.click();
                URL.revokeObjectURL(u);
              }}
            >
              下載文字
            </button>
          </div>
          <h3>版本紀錄</h3>
          {data?.versions.map((v: Doc) => (
            <div className="list-row" key={v.id}>
              <span>
                v{v.version} · {new Date(v.created_at).toLocaleString("zh-TW")}
              </span>
              {canEdit && v.version !== d.version && (
                <button
                  className="small-button"
                  onClick={async () => {
                    if (!confirm("還原為新的草稿版本？已發布內容保持原狀。"))
                      return;
                    try {
                      await api("restore-document", {
                        id: d.id,
                        kind,
                        version: d.version,
                        restore_version: v.version,
                      });
                      await load();
                      await onSaved();
                    } catch (e) {
                      setError((e as Error).message);
                    }
                  }}
                >
                  還原草稿
                </button>
              )}
            </div>
          ))}
        </>
      )}
    </Dialog>
  );
}
