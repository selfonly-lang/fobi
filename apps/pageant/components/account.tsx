"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import { ArrowUpRight, LogOut } from "lucide-react";
import { api } from "@/lib/client-api";
import { useMember, PrivateHeader, LoadingMember } from "./session";
import { statusLabel, money } from "@/lib/domain";
import type { Catalog } from "@/lib/types";
function WalletQr({ token }: { token: string }) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    let live = true;
    QRCode.toDataURL(token, {
      width: 240,
      margin: 2,
      errorCorrectionLevel: "M",
    }).then((s) => {
      if (live) setSrc(s);
    });
    return () => {
      live = false;
    };
  }, [token]);
  return (
    <div className="wallet-qr">
      {src && (
        <img src={src} alt="本人入場核銷 QR Code" width="140" height="140" />
      )}
    </div>
  );
}
export function Account({ initialTab = "profile" }: { initialTab?: string }) {
  const { member, setMember, loading, error: loadError } = useMember(),
    [tab, setTab] = useState(initialTab),
    [wallet, setWallet] = useState<Record<string, any> | null>(null),
    [catalog, setCatalog] = useState<Catalog | null>(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    if (member) {
      api("wallet")
        .then((d) => {
          setWallet(d);
          for (const o of d.orders)
            if (o.status !== "pending" || Date.parse(o.expires_at) < Date.now())
              sessionStorage.removeItem("pageant-checkout:" + o.activity_id);
        })
        .catch((e) => setError(e.message));
      api<Catalog>("catalog")
        .then(setCatalog)
        .catch(() => null);
    }
  }, [member]);
  if (loading || !member) return <LoadingMember error={loadError} />;
  const run = async (fn: () => Promise<void>) => {
    setError("");
    setNotice("");
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const bookmarks = member.bookmarks.map((b) => {
    const a = catalog?.articles.find(
        (a) => b.resource_type === "article" && a.id === b.resource_id,
      ),
      p = catalog?.projects.find(
        (p) => b.resource_type === "project" && p.id === b.resource_id,
      ),
      m = catalog?.media.find(
        (m) => b.resource_type === "media" && m.id === b.resource_id,
      );
    return {
      ...b,
      resource_id: b.resource_id,
      resource_type: b.resource_type,
      title: a?.content.title || p?.title || m?.title || "內容暫未公開",
      url: a
        ? "/news/" + a.slug
        : p
          ? "/events/" + p.slug
          : m
            ? "/tv/" + m.id
            : null,
    };
  });
  return (
    <>
      <PrivateHeader />
      <section className="account-shell">
        <header className="account-heading">
          <div>
            <span className="eyebrow">YOUR WORLD, YOUR WAY</span>
            <h1>{member.profile.display_name || "己美會員"}，歡迎回來。</h1>
            <p>報名、課程、收藏與新的舞台，都在這裡。</p>
          </div>
          <button
            className="small-button"
            onClick={() =>
              run(async () => {
                await fetch("/api/auth?action=logout", { method: "POST" });
                location.href = "/";
              })
            }
          >
            <LogOut size={15} />
            登出
          </button>
        </header>
        <nav className="account-tabs" aria-label="會員中心">
          {[
            ["profile", "個人資料"],
            ["tickets", "訂單與票券"],
            ["registrations", "我的報名與課程"],
            ["saved", "收藏與通知"],
            ["studio", "我的工作室"],
          ].map(([id, label]) => (
            <button
              key={id}
              className={tab === id ? "active" : ""}
              onClick={() => setTab(id)}
            >
              {label}
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
        {tab === "profile" && (
          <>
            <section className="panel">
              <h2>會員資料</h2>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  run(async () => {
                    await api("save-profile", {
                      display_name: fd.get("display_name"),
                      country: fd.get("country"),
                      bio: fd.get("bio"),
                      links: {
                        line: fd.get("line"),
                        website: fd.get("website"),
                        card: fd.get("card"),
                      },
                    });
                    setMember(await api("me"));
                    setNotice("會員資料已更新。");
                  });
                }}
              >
                <div className="form-grid">
                  <label className="field">
                    顯示名稱
                    <input
                      name="display_name"
                      defaultValue={member.profile.display_name}
                      required
                      maxLength={160}
                    />
                  </label>
                  <label className="field">
                    國家／地區
                    <input
                      name="country"
                      defaultValue={member.profile.country}
                      maxLength={100}
                    />
                  </label>
                  <label className="field wide">
                    關於我
                    <textarea
                      name="bio"
                      rows={4}
                      defaultValue={member.profile.bio}
                      maxLength={2000}
                    />
                  </label>
                  <label className="field">
                    個人 LINE 連結
                    <input
                      name="line"
                      type="url"
                      defaultValue={member.profile.links?.line}
                      placeholder="https://line.me/..."
                    />
                  </label>
                  <label className="field">
                    個人官網
                    <input
                      name="website"
                      type="url"
                      defaultValue={member.profile.links?.website}
                      placeholder="https://"
                    />
                  </label>
                  <label className="field wide">
                    個人化名片連結
                    <input
                      name="card"
                      type="url"
                      defaultValue={member.profile.links?.card}
                      placeholder="https://"
                    />
                  </label>
                </div>
                <button className="button dark" disabled={busy}>
                  儲存資料
                </button>
              </form>
            </section>
            <section className="panel">
              <h2>共用會員與個人服務</h2>
              <p>
                己美連結：
                {member.identities.includes("self")
                  ? "已透過己美授權確認身分"
                  : "尚未綁定；您目前使用既有SHE會員登入。"}
                　LINE：
                {member.identities.includes("line")
                  ? "已綁定"
                  : "可於SHE會員服務管理綁定。"}
              </p>
              <div className="personal-links">
                <a href="https://she.self.com.tw/line-connect/">個人 LINE ↗</a>
                <a href="https://she.self.com.tw/#chapter=profile">
                  個人官網 ↗
                </a>
                <a href="https://she.self.com.tw/workspace/?view=card">
                  個人化名片 ↗
                </a>
                <a href="https://she.self.com.tw/admin/">會員綁定與管理 ↗</a>
              </div>
            </section>
          </>
        )}
        {tab === "tickets" && (
          <>
            <section className="panel">
              <h2>我的訂單</h2>
              {wallet?.orders?.length ? (
                wallet.orders.map((o: Record<string, any>) => (
                  <div className="list-row" key={o.id}>
                    <div>
                      <h3>{o.activity?.title || o.order_no}</h3>
                      <p>
                        {o.order_no} · {o.quantity} 張 · {money(o.amount)}
                      </p>
                    </div>
                    <span className={"badge " + o.status}>
                      {o.status === "pending" &&
                      Date.parse(o.expires_at) < Date.now()
                        ? "付款逾期"
                        : statusLabel[o.status] || o.status}
                    </span>
                    {o.status === "pending" &&
                      Date.parse(o.expires_at) > Date.now() && (
                        <Link
                          href={
                            "/checkout?activity=" +
                            o.activity_id +
                            "&order=" +
                            o.id
                          }
                          className="small-button"
                        >
                          繼續付款
                        </Link>
                      )}
                    {["paid", "partially_refunded"].includes(o.status) && (
                      <button
                        className="small-button"
                        onClick={() => {
                          const qty = prompt(
                              "申請退回幾張尚未使用的票券？",
                              "1",
                            ),
                            reason = qty
                              ? prompt("請填寫退款原因（依活動規則審核）")
                              : null;
                          if (qty && reason)
                            run(async () => {
                              await api("request-refund", {
                                order_id: o.id,
                                quantity: Number(qty),
                                reason,
                              });
                              setWallet(await api("wallet"));
                              setNotice(
                                "退款申請已送出，保留中的票券暫停使用。",
                              );
                            });
                        }}
                      >
                        申請退款
                      </button>
                    )}
                  </div>
                ))
              ) : (
                <p>
                  目前沒有訂單。
                  <Link className="text-link" href="/events">
                    探索活動 ↗
                  </Link>
                </p>
              )}
            </section>
            <section className="panel">
              <h2>入場票券</h2>
              <p>QR Code 僅供本人入場使用，請勿公開分享。</p>
              {wallet?.tickets?.length ? (
                wallet.tickets.map((t: Record<string, any>) => (
                  <article className="ticket-card" key={t.id}>
                    <div>
                      <span className={"badge " + t.status}>
                        {statusLabel[t.status] || t.status}
                      </span>
                      <h3>
                        {wallet.orders.find(
                          (o: Record<string, any>) => o.id === t.order_id,
                        )?.activity?.title || "活動入場券"}
                      </h3>
                      <p>{t.ticket_no}</p>
                      <p>
                        {t.checked_in_at
                          ? "已於 " +
                            new Date(t.checked_in_at).toLocaleString("zh-TW") +
                            " 核銷"
                          : "請於活動現場出示本票券"}
                      </p>
                    </div>
                    {t.status === "valid" && <WalletQr token={t.qr_token} />}
                  </article>
                ))
              ) : (
                <p>付款確認後，票券會顯示在這裡。</p>
              )}
            </section>
          </>
        )}
        {tab === "registrations" && (
          <section className="panel">
            <h2>我的報名與課程</h2>
            {wallet?.registrations?.length ? (
              wallet.registrations.map((r: Record<string, any>) => (
                <div className="list-row" key={r.id}>
                  <div>
                    <h3>{r.activity?.title}</h3>
                    <p>
                      {r.activity?.starts_at
                        ? new Date(r.activity.starts_at).toLocaleString("zh-TW")
                        : "時間待公告"}{" "}
                      · {r.activity?.venue}
                    </p>
                  </div>
                  <span className={"badge " + r.status}>
                    {statusLabel[r.status] || r.status}
                  </span>
                  <Link
                    className="small-button"
                    href={"/activities/" + r.activity_id}
                  >
                    活動內容
                  </Link>
                </div>
              ))
            ) : (
              <p>目前沒有報名紀錄。</p>
            )}
          </section>
        )}
        {tab === "saved" && (
          <>
            <section className="panel">
              <h2>我的收藏</h2>
              {bookmarks.length ? (
                bookmarks.map((b) => (
                  <div className="list-row" key={b.resource_id}>
                    <div>
                      {b.url ? <Link href={b.url}>{b.title}</Link> : b.title}
                    </div>
                    <button
                      className="small-button"
                      onClick={() =>
                        run(async () => {
                          await api("bookmark", {
                            type: b.resource_type,
                            id: b.resource_id,
                            remove: true,
                          });
                          setMember(await api("me"));
                        })
                      }
                    >
                      移除收藏
                    </button>
                  </div>
                ))
              ) : (
                <p>閱讀新聞與探索活動時，可將喜歡的內容加入收藏。</p>
              )}
            </section>
            <section className="panel">
              <h2>通知</h2>
              {member.notifications.length ? (
                member.notifications.map((n) => (
                  <div className="list-row" key={n.id}>
                    <div>
                      <h3>{n.title}</h3>
                      <p>{n.body}</p>
                    </div>
                    <Link
                      href={n.url || "/account"}
                      className="small-button"
                      onClick={() =>
                        api("notification-read", { id: n.id }).catch(() => null)
                      }
                    >
                      查看
                    </Link>
                  </div>
                ))
              ) : (
                <p>目前沒有新通知。</p>
              )}
            </section>
          </>
        )}
        {tab === "studio" && (
          <section className="panel">
            <h2>把想法，變成下一場盛會。</h2>
            <p>
              建立主辦單位、活動企劃與專案，通過審核後開始招募、培訓、招商與售票。
            </p>
            <div className="form-actions">
              <Link href="/create" className="button dark">
                建立我的活動 <ArrowUpRight size={16} />
              </Link>
              <Link href="/studio" className="button outline">
                進入活動工作室 <ArrowUpRight size={16} />
              </Link>
            </div>
            {member.organizations.length > 0 && (
              <div style={{ marginTop: 30 }}>
                {member.organizations.map((o) => (
                  <div className="list-row" key={o.id}>
                    <div>
                      <h3>{o.name}</h3>
                    </div>
                    <span className={"badge " + o.status}>
                      {statusLabel[o.status] || o.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </section>
    </>
  );
}
