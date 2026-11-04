"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <section className="wrap section">
      <span className="eyebrow">PLEASE TRY AGAIN</span>
      <h1>內容暫時無法載入</h1>
      <p className="lead">連線可能暫時中斷，請稍後重試。</p>
      <button className="button dark" onClick={reset}>
        重新載入
      </button>
      <a className="text-link" href="https://fobi.self.com.tw/Fobi/records">
        查看活動紀錄 ↗
      </a>
    </section>
  );
}
