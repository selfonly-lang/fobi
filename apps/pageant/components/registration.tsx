"use client";
import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client-api";
import type { Activity } from "@/lib/types";
import { money, PLATFORM } from "@/lib/domain";
export function Registration({ activity }: { activity: Activity }) {
  const [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [done, setDone] = useState(false);
  if (activity.status !== "open")
    return <div className="notice">此活動目前未開放報名或購票。</div>;
  if (activity.amount)
    return (
      <div className="activity-booking">
        <strong>{money(activity.amount)}</strong>
        <a
          className="button dark"
          href={PLATFORM + "/checkout?activity=" + activity.id}
        >
          會員購票／報名 ↗
        </a>
      </div>
    );
  return (
    <div className="panel">
      <div className="panel-top">
        <h2>免費報名</h2>
        <button className="button dark" onClick={() => setOpen(!open)}>
          {open ? "收合表單" : "填寫報名資料"}
        </button>
      </div>
      {error && (
        <div className="alert" role="alert">
          {error}
        </div>
      )}
      {done ? (
        <div className="notice">
          報名資料已送出，可至會員中心查看審核進度。
          <Link href="/account?tab=registrations">查看我的報名 ↗</Link>
        </div>
      ) : (
        open && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              const fd = new FormData(e.currentTarget);
              try {
                await api("register", {
                  ...Object.fromEntries(fd),
                  activity_id: activity.id,
                  consent: fd.get("consent") === "on",
                });
                setDone(true);
              } catch (err) {
                if ((err as { status?: number }).status === 401)
                  location.href =
                    PLATFORM +
                    "/login?returnTo=" +
                    encodeURIComponent("/activities/" + activity.id);
                else setError((err as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <div className="form-grid">
              <label className="field">
                姓名
                <input name="name" required maxLength={160} />
              </label>
              <label className="field">
                Email
                <input name="email" type="email" required maxLength={254} />
              </label>
              <label className="field">
                聯絡電話
                <input name="phone" type="tel" maxLength={60} />
              </label>
              <label className="field">
                國家／地區
                <input name="country" maxLength={100} />
              </label>
              <label className="field wide">
                補充說明
                <textarea name="note" rows={3} maxLength={3000} />
              </label>
            </div>
            <label className="checkbox-field">
              <input type="checkbox" name="consent" required />
              我同意本活動報名資料使用、活動條款及取消規則。
            </label>
            <button className="button dark" disabled={busy}>
              {busy ? "正在送出…" : "登入會員並送出報名"}
            </button>
          </form>
        )
      )}
    </div>
  );
}
