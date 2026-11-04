import { cache } from "react";
import type { Catalog, Project, Article } from "./types";
export const DB = "https://tlpsqaywjcgowprhauod.supabase.co";
export const CORE = DB + "/functions/v1/pageant-core";
export const WORKSPACE = DB + "/functions/v1/pageant-workspace";
export const PUBLISHABLE = "sb_publishable_sQQtebH-fuHcAMm4e4wCPg_xRmac_l-";
export const getCatalog = cache(async (): Promise<Catalog> => {
  const r = await fetch(CORE + "?action=catalog", {
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  });
  if (!r.ok) throw Error("內容服務暫時無法載入，請稍後重試。");
  return r.json();
});
export function officialArticle(a: Article, projects: Project[]) {
  const p = projects.find((p) => p.id === a.project_id);
  return (p?.domain || "https://pageant.self.com.tw") + "/news/" + a.slug;
}
export function photoSrc(url: string) {
  return url;
}
export const defaultCover = "/editorial/event-records/upload-6dcce6b28b84.jpg";
