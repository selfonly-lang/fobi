import type { Metadata } from "next";
import { Account } from "@/components/account";
export const metadata: Metadata = {
  title: "會員中心",
  robots: { index: false, follow: false },
};
export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  return <Account initialTab={(await searchParams).tab || "profile"} />;
}
