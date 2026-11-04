"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { api } from "@/lib/client-api";
import type { Activity, Project } from "@/lib/types";
import { money } from "@/lib/domain";
import { useMember, LoadingMember, PrivateHeader } from "./session";
export function Checkout({
  activity,
  project,
  orderId,
}: {
  activity: Activity;
  project: Project;
  orderId?: string;
}) {
  const { member, loading, error: loadError } = useMember(),
    [quantity, setQuantity] = useState(1),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [key, setKey] = useState(""),
    [ready, setReady] = useState(!orderId),
    [savedOrder, setSavedOrder] = useState(orderId || "");
  useEffect(() => {
    const k = "pageant-checkout:" + activity.id;
    const existing = sessionStorage.getItem(k);
    const value = existing || crypto.randomUUID();
    sessionStorage.setItem(k, value);
    setKey(value);
  }, [activity.id]);
  useEffect(() => {
    if (member && orderId)
      api("wallet")
        .then((d) => {
          const o = d.orders.find(
            (o: Record<string, any>) =>
              o.id === orderId && o.activity_id === activity.id,
          );
          if (
            !o ||
            o.status !== "pending" ||
            Date.parse(o.expires_at) < Date.now()
          )
            throw Error("此訂單已付款、逾期或無法使用，請回會員中心查看。");
          setQuantity(o.quantity);
          setReady(true);
        })
        .catch((e) => setError(e.message));
  }, [member, orderId, activity.id]);
  if (loading || !member) return <LoadingMember error={loadError} />;
  return (
    <>
      <PrivateHeader />
      <div className="checkout-layout">
        <section>
          <span className="eyebrow">YOUR PLACE ON THE NEXT STAGE</span>
          <h1>{activity.title}</h1>
          <p className="muted">{project.title}</p>
          <div className="event-detail-info">
            <span>
              {activity.starts_at
                ? new Date(activity.starts_at).toLocaleString("zh-TW", {
                    timeZone: activity.timezone,
                  })
                : "日期待公告"}
            </span>
            <span>{activity.venue}</span>
          </div>
          <h2>活動條款</h2>
          <p className="checkout-terms">{activity.terms}</p>
          <h2>取消與退款</h2>
          <p className="checkout-terms">{activity.refund_policy}</p>
          <Link className="text-link" href={"/activities/" + activity.id}>
            查看完整活動資訊 ↗
          </Link>
        </section>
        <aside className="checkout-summary">
          <span className="eyebrow">ORDER SUMMARY</span>
          <h3>確認您的席次</h3>
          {error && (
            <div className="alert" role="alert">
              {error}
            </div>
          )}
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setError("");
              setBusy(true);
              try {
                let id = savedOrder;
                if (!id) {
                  const d = await api("create-order", {
                    activity_id: activity.id,
                    quantity,
                    idempotency_key: key,
                    terms_accepted: true,
                    buyer_info: {
                      name: new FormData(e.currentTarget).get("name"),
                      email: new FormData(e.currentTarget).get("email"),
                      phone: new FormData(e.currentTarget).get("phone"),
                    },
                  });
                  id = d.order.id;
                  setSavedOrder(id);
                }
                const d = await api("payment-form", { order_id: id });
                const url = new URL(d.url);
                if (url.origin !== "https://payment.ecpay.com.tw")
                  throw Error("付款服務網址驗證失敗");
                const form = document.createElement("form");
                form.method = "POST";
                form.action = d.url;
                for (const [k, v] of Object.entries(d.fields)) {
                  const input = document.createElement("input");
                  input.type = "hidden";
                  input.name = k;
                  input.value = String(v);
                  form.append(input);
                }
                document.body.append(form);
                form.submit();
              } catch (err) {
                setError((err as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <label className="field">
              聯絡姓名
              <input
                name="name"
                required
                maxLength={160}
                defaultValue={member.profile.display_name}
              />
            </label>
            <label className="field">
              Email
              <input
                name="email"
                type="email"
                required
                maxLength={254}
                defaultValue={member.user.email || ""}
              />
            </label>
            <label className="field">
              聯絡電話
              <input name="phone" type="tel" maxLength={60} />
            </label>
            <dl>
              <dt>票價／每位</dt>
              <dd>{money(activity.amount)}</dd>
              <dt>會員</dt>
              <dd>{member.profile.display_name || "己美會員"}</dd>
            </dl>
            <label className="field">
              數量
              <select
                value={quantity}
                disabled={!!savedOrder}
                onChange={(e) => setQuantity(Number(e.target.value))}
              >
                {Array.from({ length: 10 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {i + 1} 位
                  </option>
                ))}
              </select>
            </label>
            <div className="checkout-total">
              <span>總計</span>
              <strong>{money(activity.amount * quantity)}</strong>
            </div>
            <label className="checkbox-field">
              <input type="checkbox" required />
              我已閱讀並同意本活動與退款條款。
            </label>
            <button
              className="button dark full"
              disabled={busy || !key || !ready || activity.status !== "open"}
            >
              {busy ? "正在建立安全付款…" : "前往綠界付款"}
              <ArrowUpRight size={16} />
            </button>
            <p className="muted">
              付款由綠界處理。系統確認入帳後，票券將顯示於會員中心；請勿重複送出付款。
            </p>
          </form>
        </aside>
      </div>
    </>
  );
}
