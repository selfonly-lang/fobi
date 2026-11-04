"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { api } from "@/lib/client-api";
export type Member = {
  user: { id: string; email: string | null };
  profile: {
    display_name: string;
    country?: string;
    bio?: string;
    links?: Record<string, string>;
  };
  identities: string[];
  role: string;
  memberships: { project_id: string; role: string }[];
  organizations: Record<string, any>[];
  notifications: Record<string, any>[];
  bookmarks: Record<string, any>[];
};
export function useMember() {
  const [member, setMember] = useState<Member | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  useEffect(() => {
    let mounted = true;
    api<Member>("me")
      .then((d) => {
        if (mounted) setMember(d);
      })
      .catch((e) => {
        if (e.status === 401)
          location.replace(
            "/login?returnTo=" +
              encodeURIComponent(location.pathname + location.search),
          );
        else if (mounted) setError(e.message);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);
  return { member, setMember, loading, error };
}
export function PrivateHeader() {
  return (
    <header className="private-header">
      <Link href="/" className="app-brand">
        SELF PAGEANT<small>YOUR NEXT CHAPTER</small>
      </Link>
      <Link href="/">
        返回選美平台 <ArrowUpRight size={15} />
      </Link>
    </header>
  );
}
export function LoadingMember({ error }: { error?: string }) {
  return (
    <>
      <PrivateHeader />
      <div className="busy-page">
        <span className="eyebrow">SELF PAGEANT</span>
        <h1>{error ? "會員資料暫時無法載入" : "正在開啟您的工作區…"}</h1>
        {error && (
          <>
            <p className="alert">{error}</p>
            <button className="button dark" onClick={() => location.reload()}>
              重新載入
            </button>
          </>
        )}
      </div>
    </>
  );
}
