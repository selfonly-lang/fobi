import Link from "next/link";
export default function NotFound() {
  return (
    <section className="wrap section empty-page">
      <span className="eyebrow">THIS PAGE IS OFF STAGE</span>
      <h1>這一頁，暫未登場。</h1>
      <p>內容可能尚未公開，或網址已調整。</p>
      <Link className="button dark" href="/">
        返回首頁 ↗
      </Link>
    </section>
  );
}
