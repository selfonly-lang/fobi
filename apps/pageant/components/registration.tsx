"use client";
import { useState } from "react";
import { api } from "@/lib/client-api";
import { MISS_TAIWAN, isTaiwanInterest } from "@/lib/miss-taiwan";
import type { Activity } from "@/lib/types";
import { money, PLATFORM } from "@/lib/domain";
export function Registration({ activity }: { activity: Activity }) {
  const [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [done, setDone] = useState(false);
  const interest = isTaiwanInterest(activity.id);
  const checkLogin = async () => {
    if (open) {
      setOpen(false);
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api("me");
      setOpen(true);
    } catch (err) {
      if ((err as { status?: number }).status === 401)
        location.assign(
          PLATFORM +
            "/login?returnTo=" +
            encodeURIComponent("/activities/" + activity.id),
        );
      else setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };
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
        <h2>{interest ? "免費意願登記" : "免費報名"}</h2>
        <button className="button dark" disabled={busy} onClick={checkLogin}>
          {busy
            ? "確認登入中…"
            : open
              ? "收合表單"
              : interest
                ? "登入會員填寫意願"
                : "登入會員填寫報名"}
        </button>
      </div>
      {interest && (
        <p>
          這是免費意願登記，不是正式參賽報名、入選通知或記者會席次確認。資料僅供本屆招募及聯繫；正式資格、賽程及費用另行公告。
        </p>
      )}
      {interest && (
        <p>
          <a
            className="text-link"
            href={MISS_TAIWAN.facebook}
            target="_blank"
            rel="noopener noreferrer"
          >
            首次接觸賽事？向官方粉專詢問招募 ↗
          </a>
        </p>
      )}
      {error && (
        <div className="alert" role="alert">
          {error}
        </div>
      )}
      {done ? (
        <div className="notice">
          {interest
            ? "意願資料已送出，可至會員中心查看登記紀錄。"
            : "報名資料已送出，可至會員中心查看審核進度。"}
          <a href={PLATFORM + "/account?tab=registrations"}>查看我的登記 ↗</a>
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
              {interest
                ? "我同意將以上資料提供本屆活動主辦作招募及聯繫使用，並已閱讀本頁意願登記條款。"
                : "我同意本活動報名資料使用、活動條款及取消規則。"}
            </label>
            <button className="button dark" disabled={busy}>
              {busy ? "正在送出…" : interest ? "送出意願登記" : "送出報名"}
            </button>
          </form>
        )
      )}
    </div>
  );
}
