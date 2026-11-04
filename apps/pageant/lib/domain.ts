import type { Site } from "./types";
export const PLATFORM = "https://pageant.self.com.tw";
export function siteForHost(input: string): Site | null {
  const host = input.toLowerCase().split(":")[0];
  if (host === "fobi.self.com.tw")
    return {
      kind: "brand",
      host,
      slug: "fobi",
      name: "世界美顏小姐",
      wordmark: "FACE OF BEAUTY",
      origin: "https://" + host,
    };
  if (host === "misstaiwan.self.com.tw")
    return {
      kind: "brand",
      host,
      slug: "miss-taiwan",
      name: "台灣小姐",
      wordmark: "MISS TAIWAN",
      origin: "https://" + host,
    };
  const preview = [
    process.env.VERCEL_URL,
    process.env.VERCEL_BRANCH_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
  ].filter(Boolean);
  if (
    host === "pageant.self.com.tw" ||
    preview.includes(host) ||
    ((process.env.NODE_ENV === "development" ||
      process.env.PAGEANT_LOCAL_TEST === "1") &&
      ["localhost", "127.0.0.1", "0.0.0.0"].includes(host))
  )
    return {
      kind: "platform",
      host,
      slug: "pageant",
      name: "SELF PAGEANT",
      wordmark: "SELF PAGEANT",
      origin: PLATFORM,
    };
  return null;
}
export const statusLabel: Record<string, string> = {
  planning: "籌備中",
  recruiting: "招募中",
  active: "進行中",
  closed: "已結束",
  archived: "已結案",
  draft: "草稿",
  pending: "待審核",
  approved: "已核准",
  rejected: "未通過",
  open: "開放中",
  cancelled: "已取消",
  paid: "已付款",
  expired: "已過期",
  refund_pending: "退款處理中",
  partially_refunded: "部分退款",
  refunded: "已退款",
  requested: "待處理",
  review: "審核中",
  published: "已發布",
  scheduled: "排程中",
  withdrawn: "已下架",
  todo: "待處理",
  doing: "進行中",
  blocked: "待協調",
  done: "已完成",
  attended: "已出席",
  valid: "可使用",
  used: "已核銷",
  void: "已失效",
  held: "退款保留",
  accepted: "已確認",
  delivered: "已交付",
  processing: "處理中",
  completed: "已完成",
  failed: "需處理",
  ready: "已就緒",
};
export const money = (amount: number) =>
  new Intl.NumberFormat("zh-TW", {
    style: "currency",
    currency: "TWD",
    maximumFractionDigits: 0,
  }).format(amount);
export function safeReturn(value: string | null) {
  if (!value) return "/account";
  try {
    const u = new URL(value, PLATFORM);
    if (
      u.origin !== PLATFORM ||
      !/^\/(account|studio|create|checkout|events|activities|invite)(\/|\?|$)/.test(
        u.pathname + u.search,
      )
    )
      return "/account";
    return u.pathname + u.search;
  } catch {
    return "/account";
  }
}
export function videoEmbed(provider: string, id: string) {
  if (provider === "youtube" && /^[A-Za-z0-9_-]{11}$/.test(id))
    return "https://www.youtube-nocookie.com/embed/" + id;
  if (provider === "vimeo" && /^\d+$/.test(id))
    return "https://player.vimeo.com/video/" + id;
  return null;
}
