"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Mail, MessageCircle } from "lucide-react";
import { safeReturn } from "@/lib/domain";
export function LoginForm({
  returnTo,
  error: initialError,
}: {
  returnTo: string;
  error?: string;
}) {
  const [providers, setProviders] = useState<string[]>([]);
  useEffect(() => {
    fetch("/api/auth?action=status")
      .then((r) => r.json())
      .then((d) => setProviders(d.providers || []))
      .catch(() => null);
  }, []);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(
      initialError ? "己美授權未完成，請重新登入或使用既有SHE會員帳號。" : "",
    ),
    [notice, setNotice] = useState(""),
    [mode, setMode] = useState("password");
  const target = safeReturn(returnTo);
  return (
    <div className="login-shell">
      <section className="login-art">
        <Link href="/" className="app-brand">
          SELF PAGEANT<small>THE BEAUTY OF EVERY STORY</small>
        </Link>
        <div>
          <span className="eyebrow">YOUR NEXT CHAPTER STARTS HERE</span>
          <h1>
            每一個舞台，
            <br />
            都從妳開始。
          </h1>
          <p>用一個己美會員，探索選美、學習與新的可能。</p>
        </div>
        <small>SELF · PAGEANT · PEOPLE · POSSIBILITIES</small>
      </section>
      <section className="login-body">
        <span className="eyebrow">WELCOME TO SELF PAGEANT</span>
        <h2>開啟你的舞台</h2>
        <p>使用既有 SHE 會員帳號，管理您的活動與工作室。</p>
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
        {providers.length > 0 ? (
          <>
            <a
              className="provider-button self"
              href={
                "/api/auth?action=start&provider=self&returnTo=" +
                encodeURIComponent(target)
              }
            >
              己美會員登入 <ArrowUpRight size={18} />
            </a>
            <a
              className="provider-button line"
              href={
                "/api/auth?action=start&provider=line&returnTo=" +
                encodeURIComponent(target)
              }
            >
              <MessageCircle size={18} />
              LINE 快速登入
            </a>
          </>
        ) : (
          <div className="notice">
            己美／LINE 共用登入串接準備中。目前請使用下方既有 SHE 會員帳號。
          </div>
        )}
        <div className="login-divider">既有 SHE 會員與管理員</div>
        <details
          className="login-legacy"
          open={providers.length === 0 || !!initialError}
        >
          <summary>使用既有 SHE 會員帳號</summary>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              const fd = new FormData(e.currentTarget);
              try {
                const r = await fetch(
                  "/api/auth?action=" +
                    (mode === "password" ? "password" : "verify-code"),
                  {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(Object.fromEntries(fd)),
                  },
                );
                const d = await r.json();
                if (!r.ok) throw Error(d.error || "登入失敗");
                location.href = target;
              } catch (err) {
                setError((err as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <label className="field">
              會員 Email
              <input
                name="email"
                type="email"
                autoComplete="username"
                required
              />
            </label>
            {mode === "password" ? (
              <label className="field">
                會員密碼
                <input
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                />
              </label>
            ) : (
              <label className="field">
                驗證碼
                <input
                  name="code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  required
                  pattern="[0-9]{6,10}"
                />
              </label>
            )}
            <button className="button dark full" disabled={busy}>
              {busy ? "正在驗證…" : "登入會員"}
            </button>
            <div className="form-actions">
              <button
                className="small-button"
                type="button"
                onClick={() =>
                  setMode(mode === "password" ? "code" : "password")
                }
              >
                {mode === "password" ? "改用Email驗證" : "改用會員密碼"}
              </button>
              {mode === "code" && (
                <button
                  className="small-button"
                  type="button"
                  onClick={async (e) => {
                    const form = e.currentTarget.closest("form")!,
                      email = new FormData(form).get("email");
                    try {
                      const r = await fetch("/api/auth?action=login-code", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ email }),
                        }),
                        d = await r.json();
                      if (!r.ok) throw Error(d.error);
                      setNotice(d.message);
                    } catch (err) {
                      setError((err as Error).message);
                    }
                  }}
                >
                  寄送驗證信
                </button>
              )}
            </div>
          </form>
        </details>
        <p className="muted">
          登入不會自動取得主辦或管理權限；您的活動資料依組織與專案分開授權。
        </p>
        <Link className="text-link" href="/">
          返回平台首頁 <ArrowUpRight size={14} />
        </Link>
      </section>
    </div>
  );
}
