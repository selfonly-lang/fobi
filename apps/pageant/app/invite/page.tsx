"use client";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/client-api";
import { useMember, LoadingMember, PrivateHeader } from "@/components/session";
function Invite() {
  const { member, loading, error: loadError } = useMember(),
    params = useSearchParams(),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  if (loading || !member) return <LoadingMember error={loadError} />;
  return (
    <>
      <PrivateHeader />
      <div className="account-shell">
        <span className="eyebrow">BUILD YOUR STAGE, TOGETHER</span>
        <h1>加入賽事工作團隊</h1>
        <p>
          請確認邀請由您認識的主辦人傳送。接受後，主辦人可在團隊中看到您的會員顯示名稱。
        </p>
        {error && <div className="alert">{error}</div>}
        <button
          className="button dark"
          disabled={busy || !params.get("code")}
          onClick={async () => {
            setBusy(true);
            try {
              const d = await api("accept-invite", {
                code: params.get("code"),
              });
              location.assign("/studio?project=" + d.project_id);
            } catch (e) {
              setError((e as Error).message);
              setBusy(false);
            }
          }}
        >
          接受邀請並開啟工作室
        </button>
      </div>
    </>
  );
}
export default function Page() {
  return (
    <Suspense>
      <Invite />
    </Suspense>
  );
}
