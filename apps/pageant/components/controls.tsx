"use client";
import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { statusLabel } from "@/lib/domain";
export function Field({
  label,
  children,
  wide = false,
}: {
  label: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <label className={"field " + (wide ? "wide" : "")}>
      <span>{label}</span>
      {children}
    </label>
  );
}
export function Badge({ status }: { status: string }) {
  return (
    <span className={"badge " + status}>{statusLabel[status] || status}</span>
  );
}
export function Dialog({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      className="modal"
      aria-label={title}
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <header>
        <h2>{title}</h2>
        <button
          className="icon-button"
          type="button"
          aria-label="關閉視窗"
          onClick={onClose}
        >
          <X size={21} />
        </button>
      </header>
      {children}
    </dialog>
  );
}
export const stages = [
  ["planning", "立案企劃"],
  ["recruitment", "佳麗招募"],
  ["training", "培訓排程"],
  ["exposure", "品牌曝光"],
  ["tickets", "售票票務"],
  ["sponsors", "贊助合作"],
  ["media", "新聞媒體"],
  ["onsite", "現場執行"],
  ["closeout", "成果結案"],
];
export const roleNames: Record<string, string> = {
  owner: "平台管理員",
  manager: "專案經理",
  editor: "編輯",
  reviewer: "審核員",
  viewer: "唯讀成員",
  judge: "評審",
  finance: "財務",
  checkin: "現場核銷",
  member: "己美會員",
};
