import Link from "next/link";
import { ArrowUpRight, CalendarDays, CheckCircle2, GraduationCap, HeartHandshake, Shirt, Sparkles } from "lucide-react";
import type { Activity } from "@/lib/types";
import { SELF_AI_ASSISTANT_URL, SHE_URL } from "@/lib/home-hub";
import { money } from "@/lib/domain";
import { AIPrompts, ContactDraft } from "./hub-interactions";

const guideCards = [
  {
    title: "第一次參賽：先確認這三件事",
    text: "找主辦發布的最新簡章；核對年齡、資格與截止時間；分清楚意願登記、正式報名與錄取通知。未公告的條件不要代入往年規則。",
    label: "查看現行賽事",
    href: "/events",
  },
  {
    title: "台上自我介紹：用一句話說清楚妳的主題",
    text: "先寫出妳想讓觀眾記住的一件事。用「我是誰、我為什麼在這裡、希望留下什麼」練習 30 秒，再錄音回聽停頓和語速。",
    label: "試用分身練習提問",
    href: "#pageant-ai",
  },
  {
    title: "選禮服與道具：量完尺寸再找貨",
    text: "記下身高、衣長及穿鞋後長度，留出行走轉身空間。二手品先問清楚實際尺寸、改衣痕跡、照片授權與交付方式；先向主辦確認舞台規範。",
    label: "探索二手專區",
    href: "#pageant-market",
  },
];

export function HubNavigation() {
  const links = [
    ["#pageant-news", "選美新聞"], ["#pageant-guides", "備賽新知"], ["#pageant-events", "賽事活動"],
    ["#pageant-market", "二手服裝道具"], ["#pageant-courses", "才藝課程"], ["#pageant-ai", "SHE 與 SELF AI"],
  ];
  return (
    <nav aria-label="首頁內容捷徑" className="wrap hub-jumps">
      {links.map(([href,label]) => <a key={href} href={href}>{label}<ArrowUpRight size={13} aria-hidden /></a>)}
    </nav>
  );
}

export function HubTitle({ label, title, intro }: { label:string; title:string; intro?:string }) {
  return <header className="hub-heading"><span className="eyebrow">{label}</span><h2>{title}</h2>{intro && <p>{intro}</p>}</header>;
}

export function Guides() {
  return (
    <section className="wrap section hub-section" id="pageant-guides" aria-label="備賽新知">
      <HubTitle label="BACKSTAGE GUIDE · 備賽新知" title="從第一場選美，準備到第一場上台。" intro="三份可先做的準備，正式資格、時程及舞台規則仍以各主辦最新公告為準。" />
      <div className="hub-guide-grid">{guideCards.map((guide, i) => (
        <article className="hub-card" key={guide.title}>
          <div className="hub-card-mark">0{i+1}</div><h3>{guide.title}</h3><p>{guide.text}</p>
          <Link className="text-link" href={guide.href}>{guide.label}<ArrowUpRight size={15} aria-hidden /></Link>
        </article>
      ))}</div>
    </section>
  );
}

function dateLabel(a: Activity) {
  if (!a.starts_at) return "日期以主辦公告為準";
  if (a.title.includes("意願登記")) return "意願登記，非正式場次";
  return new Date(a.starts_at).toLocaleDateString("zh-TW", {timeZone: a.timezone || "Asia/Taipei"});
}

export function ActivityLinks({ activities, empty }: { activities: Activity[]; empty: string }) {
  if (!activities.length) return <p className="hub-empty">{empty}</p>;
  return (
    <ul className="hub-activity-list">{activities.slice(0, 3).map((a) => (
      <li key={a.id}><Link href={"/activities/" + a.id}>
        <CalendarDays size={18} aria-hidden />
        <span><strong>{a.title}</strong><small>{dateLabel(a)}{a.amount > 0 && ` · ${money(a.amount)}`}</small></span>
        <ArrowUpRight size={17} aria-hidden />
      </Link></li>
    ))}</ul>
  );
}

export function MarketAndCourses({ courses }: { courses: Activity[] }) {
  return (
    <div className="wrap section hub-resource-grid">
      <section className="hub-panel hub-panel-market" id="pageant-market" aria-label="二手服裝與道具">
        <Shirt size={27} aria-hidden />
        <HubTitle label="SECOND STAGE · 二手專區" title="讓舞台服裝，再登台一次。" intro="禮服、國服、舞台配件與才藝道具。這裡先受理人工洽詢，目前沒有公開刊登的商品，也不提供站內付款。" />
        <ul className="hub-tags"><li>晚禮服與國服</li><li>舞台配件</li><li>才藝道具</li></ul>
        <ContactDraft group="market" />
      </section>
      <section className="hub-panel hub-panel-course" id="pageant-courses" aria-label="才藝課程">
        <GraduationCap size={29} aria-hidden />
        <HubTitle label="PAGEANT ACADEMY · 才藝課程" title="把興趣練成上台的實力。" intro="課程主題可從台步儀態、口條表達、舞蹈與才藝展演開始；實際班次以主辦公開資訊為準。" />
        <ActivityLinks activities={courses} empty="目前沒有開放報名的培訓班次。想上課或有教學資源，歡迎先洽詢。" />
        <Link href="/events?type=course" className="text-link">查看課程公告 <ArrowUpRight size={15} aria-hidden /></Link>
        <ContactDraft group="course" />
      </section>
    </div>
  );
}

export function Ecosystem() {
  return (
    <section className="hub-ecosystem" id="pageant-ai" aria-label="SHE 與 SELF AI 數位分身">
      <div className="wrap section">
        <HubTitle label="THE SELF NETWORK · 跨站探索" title="離開舞台，還有下一個故事。" intro="用 SHE 展示自己的風格與作品；用己美 SELF AI 盤點備賽問題。" />
        <div className="hub-resource-grid">
          <article className="hub-panel hub-panel-she">
            <HeartHandshake size={28} aria-hidden />
            <span className="eyebrow">SHE WOMEN</span>
            <h3>讓個人風格變成作品集</h3>
            <p>探索 SHE 女性時尚平台與女企業家專頁。參賽者、造型師與講師，可先看看個人品牌怎麼呈現作品、服務與合作資訊。</p>
            <a className="button outline" href={SHE_URL}>前往 SHE <ArrowUpRight size={16} aria-hidden /></a>
          </article>
          <article className="hub-panel hub-panel-ai">
            <Sparkles size={28} aria-hidden />
            <span className="eyebrow">SELF AI · 己美數位分身</span>
            <h3>用一個好問題，開始備賽練習。</h3>
            <p>先選擇站內固定範本（非生成式），再到 SELF AI 與數位分身對話。本站不會轉傳帳號資料或自動發問。</p>
            <AIPrompts />
            <a className="text-link" href={SELF_AI_ASSISTANT_URL}>開啟我的分身助理 <ArrowUpRight size={15} aria-hidden /></a>
          </article>
        </div>
      </div>
    </section>
  );
}

export function InterestCard({ activity }: { activity: Activity }) {
  return (
    <div className="hub-interest">
      <CheckCircle2 size={19} aria-hidden />
      <div><span>籌備動態 · 意願登記開放中</span><strong>{activity.title}</strong><p>免費登記意願，不等於正式報名。簡章、資格及賽程另行公告。</p></div>
      <Link className="button dark" href={"/activities/" + activity.id}>登記參賽意願 <ArrowUpRight size={16} aria-hidden /></Link>
    </div>
  );
}
