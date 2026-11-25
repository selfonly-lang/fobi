import type { Activity, Catalog } from "./types";

export const SHE_URL = "https://she.self.com.tw/";
export const SELF_AI_URL = "https://www.self.com.tw/self-ai";
export const SELF_AI_ASSISTANT_URL = "https://www.self.com.tw/self-ai/assistant";
export const PAGEANT_CONTACT = { line: "beautiself", phone: "0935-523-001", tel: "+886935523001" };
const MISS_TAIWAN_INTEREST = "2218dddc-9f96-53b9-bc08-5fcfcfa7b3f3";
const MISS_TAIWAN_MEDIA_INTEREST = "37b21910-cfa9-5bde-9db1-c6e2d18dedf5";
const activitiesOrder = (a: Activity, b: Activity) =>
  (a.starts_at || "9999").localeCompare(b.starts_at || "9999");
export const isCourse = (kind: string) => ["course", "training"].includes(kind);
export function isRegistrationOpen(a: Activity, now: number): boolean {
  return a.status === "open" && (!a.ends_at || Date.parse(a.ends_at) > now);
}
export function pageantHomeCatalog(data: Catalog, now: number = Date.now()) {
  const projects = new Map(data.projects.map((project) => [project.id, project]));
  const publicActivities = data.activities.filter((activity) => {
    const project = projects.get(activity.project_id);
    return !!project && !["archived", "closed", "draft"].includes(project.status);
  });
  const interest = publicActivities.find((activity) =>
    activity.id === MISS_TAIWAN_INTEREST &&
    projects.get(activity.project_id)?.slug === "miss-taiwan-2027" &&
    isRegistrationOpen(activity, now) && activity.amount === 0 &&
    (!activity.starts_at || Date.parse(activity.starts_at) <= now),
  );
  const isCurrent = (activity: Activity) => {
    const ongoingIntake = projects.get(activity.project_id)?.slug === "miss-taiwan-2027" &&
      (activity.id === MISS_TAIWAN_INTEREST || activity.id === MISS_TAIWAN_MEDIA_INTEREST);
    const starts = activity.starts_at ? Date.parse(activity.starts_at) : null;
    if (ongoingIntake)
      return isRegistrationOpen(activity, now) && (starts === null || starts <= now);
    if (activity.ends_at) return Date.parse(activity.ends_at) > now;
    return starts === null || starts >= now;
  };
  const courses = publicActivities
    .filter((activity) => isCourse(activity.kind) && isRegistrationOpen(activity, now) && isCurrent(activity))
    .sort(activitiesOrder);
  const events = publicActivities
    .filter((activity) =>
      !isCourse(activity.kind) && activity.id !== interest?.id &&
      (activity.status === "open" || activity.status === "active") && isCurrent(activity),
    )
    .sort(activitiesOrder);
  return { interest, courses, events };
}

export const inquiryOptions = {
  market: [
    { label: "刊登二手服裝", topic: "二手服裝刊登", fields: ["服裝類型／尺寸", "品況與可提供照片", "預期售價、出租或交換", "地區與交付方式"] },
    { label: "刊登二手道具", topic: "二手道具刊登", fields: ["道具名稱／尺寸", "品況與可提供照片", "預期售價、出租或交換", "地區與交付方式"] },
    { label: "找服裝或道具", topic: "二手服裝或道具需求", fields: ["要找的物品／尺寸", "預算範圍", "希望取用時間與地區"] },
  ],
  course: [
    { label: "我想上課", topic: "才藝課程需求", fields: ["想學的主題（台步、口條、舞蹈等）", "所在縣市／接受線上課否", "方便上課的時段"] },
    { label: "我是講師或教室", topic: "才藝課程合作", fields: ["課程主題與適合對象", "所在縣市／線上或實體", "開課時段、費用與可提供的介紹連結"] },
  ],
} as const;

export type InquiryGroup = keyof typeof inquiryOptions;

export function inquiryDraft(group: InquiryGroup, index: number): string {
  const option = inquiryOptions[group][index] ?? inquiryOptions[group][0];
  return [`您好，我想洽詢 SELF PAGEANT 的「${option.topic}」。`, ...option.fields.map((field) => `${field}：`)].join("\n");
}
