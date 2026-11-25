"use client";

import { useRef, useState } from "react";
import { ArrowUpRight, Clipboard, MessageCircle } from "lucide-react";
import { inquiryDraft, inquiryOptions, PAGEANT_CONTACT, SELF_AI_URL } from "@/lib/home-hub";
import type { InquiryGroup } from "@/lib/home-hub";

const prompts = [
  { label: "第一次參賽", text: "我是第一次接觸選美。請用繁體中文幫我整理參賽前要向主辦確認的問題，以及不涉及個資的備賽待辦；未公告的規則不要猜測。" },
  { label: "練習台上自我介紹", text: "請用繁體中文和我練習 30 秒的台上自我介紹。先問我想傳達的主題，再給我一個練習題；不用提供真實姓名或聯絡方式。" },
  { label: "準備服裝與道具", text: "請用繁體中文提供選美服裝和道具的整理清單，包括尺寸、活動安全及向主辦確認規範的問題；不要猜測本屆規定。" },
];

async function tryCopy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function ContactDraft({ group }: { group: InquiryGroup }) {
  const [choice, setChoice] = useState(0);
  const [draft, setDraft] = useState(() => inquiryDraft(group, 0));
  const [status, setStatus] = useState("");
  const area = useRef<HTMLTextAreaElement>(null);
  return (
    <details className="hub-inquiry">
      <summary><MessageCircle size={17} aria-hidden />{group === "market" ? "我要刊登或找二手用品" : "我想上課／我是講師"}</summary>
      <p>選一個需求，補上重點後複製。請在 LINE 搜尋 <strong>{PAGEANT_CONTACT.line}</strong> 並自行貼上送出。這裡不會送出、儲存或公開你的資料。</p>
      <label className="hub-field">
        <span>洽詢類型</span>
        <select value={choice} onChange={(e) => {
          const next = Number(e.target.value);
          setChoice(next);
          setDraft(inquiryDraft(group, next));
          setStatus("");
        }}>
          {inquiryOptions[group].map((option, i) => <option key={option.topic} value={i}>{option.label}</option>)}
        </select>
      </label>
      <label className="hub-field">
        <span>洽詢草稿</span>
        <textarea ref={area} rows={6} maxLength={1600} value={draft} onChange={(e) => { setDraft(e.target.value); setStatus(""); }} />
      </label>
      <div className="hub-actions">
        <button type="button" className="button dark" disabled={!draft.trim()} onClick={async () => {
          if (await tryCopy(draft)) setStatus("已複製，請自行貼到 LINE 送出。");
          else { area.current?.focus(); area.current?.select(); setStatus("瀏覽器未允許複製，已選取文字，可手動複製。"); }
        }}><Clipboard size={16} aria-hidden />複製洽詢草稿</button>
        <a className="text-link" href={`tel:${PAGEANT_CONTACT.tel}`}>電話洽詢 <ArrowUpRight size={15} aria-hidden /></a>
      </div>
      <p className="hub-form-status" role="status">{status}</p>
    </details>
  );
}

export function AIPrompts() {
  const [choice, setChoice] = useState(0);
  const [status, setStatus] = useState("");
  const area = useRef<HTMLTextAreaElement>(null);
  const prompt = prompts[choice];
  return (
    <div className="hub-ai-prompt">
      <label className="hub-field">
        <span>想和分身聊什麼？</span>
        <select value={choice} onChange={(e) => {setChoice(Number(e.target.value)); setStatus("");}}>
          {prompts.map((p, i) => <option key={p.label} value={i}>{p.label}</option>)}
        </select>
      </label>
      <label className="hub-field">
        <span>可複製的開場問題</span>
        <textarea ref={area} readOnly rows={3} value={prompt.text} />
      </label>
      <div className="hub-actions">
        <button type="button" className="button outline" onClick={async () => {
          if (await tryCopy(prompt.text)) setStatus("已複製，前往 SELF AI 後可自行貼上。");
          else { area.current?.focus(); area.current?.select(); setStatus("已選取問題，可手動複製。"); }
        }}><Clipboard size={16} aria-hidden />複製問題</button>
        <a className="button dark" href={SELF_AI_URL}>前往 SELF AI <ArrowUpRight size={16} aria-hidden /></a>
      </div>
      <p className="hub-form-status" role="status">{status}</p>
    </div>
  );
}
