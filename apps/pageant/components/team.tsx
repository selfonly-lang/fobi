"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/client-api";
import { Dialog, Field, roleNames } from "./controls";
import type { Doc } from "./editors";
export function TeamDialog({
  projectId,
  currentUser,
  onClose,
}: {
  projectId: string;
  currentUser: string;
  onClose: () => void;
}) {
  const [data, setData] = useState<Doc | null>(null),
    [role, setRole] = useState("editor"),
    [url, setUrl] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const load = async () =>
    setData(await api("team", undefined, { project: projectId }));
  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [projectId]);
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await fn();
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog title="專案團隊與邀請" onClose={onClose}>
      {error && <div className="alert">{error}</div>}
      <p>
        每位成員使用自己的己美會員登入。邀請連結七天內有效，只能接受一次；請私下交付給指定成員。
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          run(async () => {
            const d = await api("create-invite", {
              project_id: projectId,
              role,
            });
            setUrl(d.url);
          });
        }}
      >
        <Field label="邀請角色">
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            {[
              "manager",
              "editor",
              "reviewer",
              "viewer",
              "judge",
              "finance",
              "checkin",
            ].map((r) => (
              <option key={r} value={r}>
                {roleNames[r]}
              </option>
            ))}
          </select>
        </Field>
        <button className="button dark" disabled={busy}>
          產生私人邀請連結
        </button>
      </form>
      {url && (
        <div className="notice">
          <Field label="新邀請連結">
            <input readOnly value={url} onFocus={(e) => e.target.select()} />
          </Field>
          <button
            className="small-button"
            onClick={() =>
              navigator.clipboard
                .writeText(url)
                .catch(() => setError("請選取上方連結複製。"))
            }
          >
            複製
          </button>
        </div>
      )}
      <h3>已加入成員</h3>
      {data?.members.map((m: Doc) => (
        <div className="list-row" key={m.user_id}>
          <div>
            <b>{m.name}</b>
            <p>{roleNames[m.role]}</p>
          </div>
          {m.user_id !== currentUser && (
            <button
              className="small-button"
              disabled={busy}
              onClick={() => {
                if (confirm("移除此成員的專案存取權限？"))
                  run(async () => {
                    await api("remove-member", {
                      project_id: projectId,
                      user_id: m.user_id,
                    });
                  });
              }}
            >
              移除
            </button>
          )}
        </div>
      ))}
      <h3>邀請紀錄</h3>
      {data?.invites.map((i: Doc) => (
        <div className="list-row" key={i.id}>
          <div>
            {roleNames[i.role]}
            <p>有效至 {new Date(i.expires_at).toLocaleString("zh-TW")}</p>
          </div>
          <span>
            {i.accepted_by
              ? "已接受"
              : i.revoked_at
                ? "已撤銷"
                : Date.parse(i.expires_at) < Date.now()
                  ? "已到期"
                  : "待接受"}
          </span>
          {!i.accepted_by &&
            !i.revoked_at &&
            Date.parse(i.expires_at) > Date.now() && (
              <button
                className="small-button"
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    await api("revoke-invite", { id: i.id });
                  })
                }
              >
                撤銷
              </button>
            )}
        </div>
      ))}
    </Dialog>
  );
}
