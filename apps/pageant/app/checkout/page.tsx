import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCatalog } from "@/lib/catalog";
import { Checkout } from "@/components/checkout";
export const metadata: Metadata = {
  title: "會員購票・安全結帳",
  robots: { index: false, follow: false },
};
export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const q = await searchParams,
    d = await getCatalog(),
    a = d.activities.find((a) => a.id === q.activity);
  if (!a) notFound();
  const p = d.projects.find((p) => p.id === a.project_id);
  if (!p) notFound();
  if (a.amount === 0) redirect("/activities/" + a.id);
  return <Checkout activity={a} project={p} orderId={q.order} />;
}
