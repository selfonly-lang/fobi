export type Photo = {
  url: string;
  caption: string;
  source: string;
  kind?: string;
};
export type Section = { heading: string; paragraphs: string[] };
export type ArticleContent = {
  title: string;
  subtitle?: string;
  byline?: string;
  category?: string;
  partner?: string;
  topic?: string;
  photos: Photo[];
  sources: { title: string; url: string }[];
  facts?: string[];
  perspective?: string[];
  sections: Section[];
  closing?: string[];
  format_label?: string;
};
export type Article = {
  id: string;
  project_id: string | null;
  slug: string;
  content: ArticleContent;
  publish_at: string;
  updated_at: string;
};
export type Project = {
  id: string;
  slug: string;
  title: string;
  status: string;
  year: number;
  event_date: string | null;
  venue: string;
  domain: string;
  summary: string;
  brand_id: string | null;
  sort_order: number;
  official_ready?: boolean;
  country_code?: string;
  review_status?: string;
  version?: number;
  public?: boolean;
};
export type Brand = {
  id: string;
  slug: string;
  name: string;
  domain: string;
  primary_project_id: string;
  domain_status?: string;
  theme: { accent?: string; wordmark?: string };
};
export type Activity = {
  id: string;
  project_id: string;
  kind: string;
  title: string;
  description: string;
  status: string;
  starts_at: string | null;
  ends_at: string | null;
  timezone: string;
  venue: string;
  capacity: number;
  amount: number;
  currency: string;
  terms: string;
  refund_policy: string;
};
export type Media = {
  id: string;
  project_id: string | null;
  title: string;
  description: string;
  kind: string;
  provider: "youtube" | "vimeo" | "cloudflare" | "self";
  external_id: string;
  poster: string;
  caption: string;
  source: string;
  created_at: string;
};
export type Chapter = {
  heading: string;
  paragraphs: string[];
  photo?: string;
  caption?: string;
};
export type Publication = {
  id: string;
  project_id: string;
  slug: string;
  title: string;
  description: string;
  publication: {
    title: string;
    description: string;
    chapters: Chapter[];
    version: number;
  };
  updated_at: string;
};
export type Catalog = {
  ok: boolean;
  home?: { hero_article_id?: string; feature_article_id?: string };
  brands: Brand[];
  projects: Project[];
  activities: Activity[];
  articles: Article[];
  media: Media[];
  publications: Publication[];
  contestants?: Record<string, any>[];
  results?: Record<string, any>[];
};
export type Site = {
  kind: "platform" | "brand";
  host: string;
  slug: string;
  name: string;
  wordmark: string;
  origin: string;
};
