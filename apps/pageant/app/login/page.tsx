import type { Metadata } from "next";
import { LoginForm } from "@/components/login";
export const metadata: Metadata = {
  title: "己美會員登入",
  robots: { index: false, follow: false },
};
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const q = await searchParams;
  return <LoginForm returnTo={q.returnTo || "/account"} error={q.error} />;
}
