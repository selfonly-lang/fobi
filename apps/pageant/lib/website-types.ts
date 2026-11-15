import defaults from "../content/miss-taiwan-site.json";
export type SitePhoto = {
  id: string;
  url: string;
  alt: string;
  caption: string;
  source_url: string;
  source_label: string;
  kind: "real" | "ai";
  year: number | null;
  focal_x: number;
  focal_y: number;
};
export type WebsiteContent = {
  brand_name: string;
  headline: string;
  intro: string;
  about_heading: string;
  about_body: string;
  training_heading: string;
  training_body: string;
  partner_heading: string;
  partner_body: string;
  gallery_heading: string;
  gallery_intro: string;
  hero_photo: SitePhoto;
  training_photo: SitePhoto | null;
  gallery: SitePhoto[];
};
export const DEFAULT_WEBSITE = defaults as WebsiteContent;
export const photoLabel = (p: SitePhoto) =>
  p.kind === "ai"
    ? "AI 形象示意｜非實際人物或活動紀錄"
    : `${p.year ? `${p.year} 年 · ` : ""}歷屆實拍`;
