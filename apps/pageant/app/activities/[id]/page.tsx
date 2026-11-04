import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CalendarDays, MapPin } from "lucide-react";
import { getCatalog } from "@/lib/catalog";
import { statusLabel } from "@/lib/domain";
import { Registration } from "@/components/registration";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params,
    d = await getCatalog(),
    a = d.activities.find((a) => a.id === id);
  return a
    ? { title: a.title, description: a.description.slice(0, 200) }
    : { title: "活動尚未公開" };
}
export default async function ActivityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params,
    d = await getCatalog(),
    a = d.activities.find((a) => a.id === id);
  if (!a) notFound();
  return (
    <article className="activity-detail">
      <span className="eyebrow">
        {a.kind.toUpperCase()} · {statusLabel[a.status]}
      </span>
      <h1>{a.title}</h1>
      <div className="event-detail-info">
        <span>
          <CalendarDays size={16} />
          {a.starts_at
            ? new Date(a.starts_at).toLocaleString("zh-TW", {
                timeZone: a.timezone,
              })
            : "日期待公告"}
          （{a.timezone}）
        </span>
        <span>
          <MapPin size={16} />
          {a.venue || "地點待公告"}
        </span>
      </div>
      <p className="activity-description">{a.description}</p>
      <Registration activity={a} />
      <section className="panel">
        <h2>活動條款</h2>
        <p className="checkout-terms">{a.terms || "活動條款確認後公告。"}</p>
        <h3>取消與退款</h3>
        <p className="checkout-terms">
          {a.refund_policy || "取消規則確認後公告。"}
        </p>
      </section>
    </article>
  );
}
