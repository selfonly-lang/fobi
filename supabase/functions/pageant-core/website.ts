// One published snapshot powers the branded domain and the platform landing page.
// Drafts and the rest of project.config are never part of the public response.
import { safeUrl } from "./model.js";
type C = Record<string, any>;
const fields: Record<string, number> = {
  brand_name: 120,
  headline: 160,
  intro: 600,
  about_heading: 160,
  about_body: 1500,
  training_heading: 160,
  training_body: 1500,
  partner_heading: 160,
  partner_body: 1500,
  gallery_heading: 160,
  gallery_intro: 1000,
};
export const websiteActions = [
  "ops-site",
  "ops-site-draft",
  "ops-site-save",
  "ops-site-publish",
];
const txt = (v: any, max: number) => {
  if (typeof v !== "string" || v.trim().length > max)
    throw Error("官網文字格式或長度不正確");
  return v.trim();
};
export function sanitizeWebsite(value: any) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw Error("官網內容格式不正確");
  const out: C = {};
  for (const [k, n] of Object.entries(fields)) out[k] = txt(value[k] ?? "", n);
  if (!out.brand_name || !out.headline) throw Error("請填寫品牌名稱與首頁標題");
  function photo(p: any) {
    if (p == null) return null;
    if (typeof p !== "object" || Array.isArray(p))
      throw Error("照片格式不正確");
    const url = txt(p.url, 2000);
    if (!safeUrl(url, { image: true }))
      throw Error("請使用HTTPS或站內圖片網址");
    if (!["real", "ai"].includes(p.kind)) throw Error("請標示實拍或AI示意");
    const source_url = txt(p.source_url ?? "", 1500);
    if (source_url && !safeUrl(source_url))
      throw Error("照片來源須為HTTPS或站內網址");
    const year = p.year == null || p.year === "" ? null : Number(p.year);
    if (
      year !== null &&
      (!Number.isInteger(year) || year < 1900 || year > 2200)
    )
      throw Error("照片年份格式不正確");
    const pos = (v: any) =>
      Number.isInteger(v) && v >= 0 && v <= 100 ? v : 50;
    const result = {
      id: txt(p.id || crypto.randomUUID(), 80),
      url,
      alt: txt(p.alt ?? "", 300),
      caption: txt(p.caption ?? "", 1000),
      source_url,
      source_label: txt(p.source_label ?? "", 300),
      kind: p.kind,
      year,
      focal_x: pos(p.focal_x),
      focal_y: pos(p.focal_y),
    };
    if (!result.alt || !result.caption || !result.source_label || !source_url)
      throw Error("每張照片需填寫替代文字、圖說與來源");
    return result;
  }
  out.hero_photo = photo(value.hero_photo);
  out.training_photo = photo(value.training_photo);
  if (!out.hero_photo) throw Error("請選擇首頁主照片");
  if (!Array.isArray(value.gallery) || value.gallery.length > 18)
    throw Error("活動相簿最多18張");
  out.gallery = value.gallery.map(photo);
  if (out.gallery.some((p: any) => !p)) throw Error("請移除未完成的相簿項目");
  return out;
}
export function websiteImageReferences(value: any): string[] {
  if (!value || typeof value !== "object") return [];
  return [
    value.hero_photo?.url,
    value.training_photo?.url,
    ...(Array.isArray(value.gallery)
      ? value.gallery.map((p: any) => p?.url)
      : []),
  ].filter((u: any) => typeof u === "string");
}
export async function websitePublic(
  action: string,
  method: string,
  u: URL,
  c: C,
) {
  if (action !== "ops-site") return null;
  if (method !== "GET") c.fail("不支援此操作", 405);
  const p = await c.result(
    c.db
      .from("pageant_projects")
      .select("id,public,review_status,config")
      .eq("id", c.id(u.searchParams.get("project")))
      .maybeSingle(),
  );
  if (!p || !p.public || p.review_status !== "approved")
    c.fail("官網尚未公開", 404);
  const site = p.config?.website;
  let content = null;
  try {
    content = site?.published ? sanitizeWebsite(site.published) : null;
  } catch {
    content = null;
  }
  return {
    ok: true,
    project_id: p.id,
    content,
    revision: site?.published_revision || 0,
    published_at: site?.published_at || null,
  };
}
async function normalizeImages(content: C, pid: string, c: C) {
  const copy = structuredClone(content),
    photos = [copy.hero_photo, copy.training_photo, ...copy.gallery].filter(
      Boolean,
    );
  for (const photo of photos)
    photo.url = await c.normalizeImage(photo.url, pid);
  const paths = photos
    .map((p: C) => {
      const u = new URL(p.url, "https://pageant.self.com.tw");
      return u.pathname === "/api/news" ? u.searchParams.get("path") : null;
    })
    .filter(Boolean);
  if (paths.length) {
    const assets = await c.result(
      c.db
        .from("pageant_assets")
        .select("id")
        .eq("project_id", pid)
        .in("object_path", paths),
    );
    const ids = assets.map((a: C) => a.id);
    if (ids.length) {
      const [f, i] = await Promise.all([
        c.result(
          c.db
            .from("pageant_finance_entries")
            .select("id")
            .in("proof_asset_id", ids)
            .limit(1),
        ),
        c.result(
          c.db
            .from("pageant_invoice_records")
            .select("id")
            .in("proof_asset_id", ids)
            .limit(1),
        ),
      ]);
      if (f.length || i.length) c.fail("帳務憑證不能作為公開官網照片", 403);
    }
  }
  return copy;
}
export async function websiteMember(
  action: string,
  method: string,
  u: URL,
  b: C,
  c: C,
) {
  if (!websiteActions.includes(action) || action === "ops-site") return null;
  const pid = c.id(
      method === "GET" ? u.searchParams.get("project") : b.project_id,
    ),
    role = c.permit(pid, ["owner", "manager", "editor", "reviewer", "viewer"]);
  const p = await c.result(
      c.db
        .from("pageant_projects")
        .select("id,public,review_status,config,version")
        .eq("id", pid)
        .single(),
    ),
    old = p.config?.website || {};
  if (action === "ops-site-draft" && method === "GET")
    return {
      ok: true,
      version: p.version,
      draft: old.draft || old.published || null,
      published: old.published || null,
      published_at: old.published_at || null,
      role,
    };
  if (method !== "POST") c.fail("不支援此操作", 405);
  if (!["owner", "manager", "editor"].includes(role))
    c.fail("需要專案編輯權限", 403);
  if (c.integer(b.version, 1) !== p.version)
    c.fail("官網已被其他人更新，請重新載入再編輯", 409);
  let next: C;
  if (action === "ops-site-save") {
    let parsed: C;
    try {
      parsed = sanitizeWebsite(b.content);
    } catch (e) {
      c.fail((e as Error).message);
    }
    const draft = await normalizeImages(parsed!, pid, c);
    next = {
      ...old,
      draft,
      draft_updated_by: c.uid,
      draft_updated_at: new Date().toISOString(),
    };
  } else if (action === "ops-site-publish") {
    if (!["owner", "manager"].includes(role))
      c.fail("發布需要專案主辦或經理確認", 403);
    if (!p.public || p.review_status !== "approved")
      c.fail("專案通過公開審核後才能發布官網", 403);
    if (b.rights_confirmed !== true)
      c.fail("請確認照片人物、年份、來源與使用範圍");
    if (!old.draft) c.fail("請先儲存官網草稿");
    let parsed: C;
    try {
      parsed = sanitizeWebsite(old.draft);
    } catch (e) {
      c.fail((e as Error).message);
    }
    const published = await normalizeImages(parsed!, pid, c);
    next = {
      ...old,
      previous_published: old.published || null,
      published,
      published_revision: p.version + 1,
      published_at: new Date().toISOString(),
      published_by: c.uid,
    };
  } else c.fail("功能不存在", 404);
  const row = await c.result(
    c.db
      .from("pageant_projects")
      .update({ config: { ...p.config, website: next! } })
      .eq("id", pid)
      .eq("version", p.version)
      .select("version")
      .maybeSingle(),
  );
  if (!row) c.fail("官網已被其他人更新，請重新載入再編輯", 409);
  await c.audit(c.uid, action, pid, pid, { version: row.version });
  return {
    ok: true,
    version: row.version,
    draft: next!.draft,
    published_at: next!.published_at || null,
  };
}
