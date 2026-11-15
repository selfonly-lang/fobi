import test from "node:test";
import assert from "node:assert/strict";
import {
  sanitizeWebsite,
  websitePublic,
  websiteMember,
  websiteImageReferences,
} from "../../../supabase/functions/pageant-core/website.ts";
const P = "00000000-0000-4000-8000-000000000001";
function content(headline = "PUBLIC TITLE") {
  return {
    brand_name: "Miss Taiwan",
    headline,
    intro: "",
    about_heading: "",
    about_body: "",
    training_heading: "",
    training_body: "",
    partner_heading: "",
    partner_body: "",
    gallery_heading: "",
    gallery_intro: "",
    hero_photo: {
      id: "photo",
      url: "/miss-taiwan-2027/real/official-2025.webp",
      alt: "Past winners",
      caption: "Past winners, 2025",
      source_label: "Official page",
      source_url: "https://www.facebook.com/Taiwanpageant/",
      year: 2025,
      kind: "real",
      focal_x: 50,
      focal_y: 50,
    },
    training_photo: null,
    gallery: [],
  };
}
function context(role = "manager") {
  const project: any = {
    id: P,
    public: true,
    review_status: "approved",
    version: 3,
    config: {
      season_blueprint: { retain: true },
      internal_secret: "DO NOT EXPOSE",
      website: {
        published: content(),
        draft: content("PRIVATE DRAFT"),
        published_revision: 2,
        published_at: "2026-11-15T00:00:00Z",
        published_by: "PRIVATE ACTOR",
      },
    },
  };
  const tables: Record<string, any[]> = {
      pageant_projects: [project],
      pageant_assets: [],
      pageant_finance_entries: [],
      pageant_invoice_records: [],
    },
    audit: any[] = [];
  const c: any = {
    uid: "manager-id",
    integer: (v: number, min: number) => {
      if (!Number.isInteger(v) || v < min) throw Error("integer");
      return v;
    },
    id: (x: string) => x,
    fail: (m: string, s = 400) => {
      throw Object.assign(Error(m), { status: s });
    },
    permit: (_id: string, roles: string[]) => {
      if (!roles.includes(role)) c.fail("not permitted", 403);
      return role;
    },
    normalizeImage: async (u: string) => u,
    audit: async (...a: any[]) => audit.push(a),
    result: async (q: any) => await q,
    db: {
      from: (table: string) => {
        let filters: ((r: any) => boolean)[] = [],
          data: any = null,
          one = false;
        const q: any = {
          select: () => q,
          eq: (k: string, v: any) => {
            filters.push((r) => r[k] === v);
            return q;
          },
          in: (k: string, v: any[]) => {
            filters.push((r) => v.includes(r[k]));
            return q;
          },
          limit: () => q,
          single: () => {
            one = true;
            return q;
          },
          maybeSingle: () => {
            one = true;
            return q;
          },
          update: (v: any) => {
            data = v;
            return q;
          },
          then: (resolve: any, reject: any) => {
            let rows = (tables[table] || []).filter((r) =>
              filters.every((f) => f(r)),
            );
            if (data)
              rows = rows.map((r) => {
                Object.assign(r, data, { version: r.version + 1 });
                return r;
              });
            return Promise.resolve(
              one ? structuredClone(rows[0] || null) : structuredClone(rows),
            ).then(resolve, reject);
          },
        };
        return q;
      },
    },
  };
  return { c, project, tables, audit };
}
const url = new URL("https://example.invalid/?project=" + P);
test("website publication uses a strict DTO and excludes private draft and project configuration", async () => {
  const { c } = context();
  const r = await websitePublic("ops-site", "GET", url, c);
  assert.equal(r?.content?.headline, "PUBLIC TITLE");
  const s = JSON.stringify(r);
  for (const privateValue of [
    "PRIVATE DRAFT",
    "PRIVATE ACTOR",
    "DO NOT EXPOSE",
    "season_blueprint",
  ])
    assert.ok(!s.includes(privateValue));
});
test("website content rejects unsafe photos and drops unrecognized fields", () => {
  const d: any = content();
  d.private_secret = "SECRET";
  d.hero_photo.private_token = "SECRET";
  const clean = sanitizeWebsite(d);
  assert.ok(!JSON.stringify(clean).includes("SECRET"));
  d.hero_photo.url = "javascript:alert(1)";
  assert.throws(() => sanitizeWebsite(d));
  d.hero_photo.url = "/safe.jpg";
  d.gallery = new Array(19).fill(d.hero_photo);
  assert.throws(() => sanitizeWebsite(d));
});
test("saving a website draft does not publish it or overwrite the season blueprint", async () => {
  const { c, project, audit } = context();
  const r = await websiteMember(
    "ops-site-save",
    "POST",
    url,
    { project_id: P, version: 3, content: content("NEW PRIVATE DRAFT") },
    c,
  );
  assert.equal(r?.version, 4);
  assert.equal(project.config.website.published.headline, "PUBLIC TITLE");
  assert.equal(project.config.website.draft.headline, "NEW PRIVATE DRAFT");
  assert.equal(project.config.season_blueprint.retain, true);
  assert.equal(audit.length, 1);
});
test("publishing requires manager role, source confirmation, approved project and a current version", async () => {
  let x = context("editor");
  await assert.rejects(
    () =>
      websiteMember(
        "ops-site-publish",
        "POST",
        url,
        { project_id: P, version: 3, rights_confirmed: true },
        x.c,
      ),
    (e: any) => e.status === 403,
  );
  x = context();
  await assert.rejects(
    () =>
      websiteMember(
        "ops-site-publish",
        "POST",
        url,
        { project_id: P, version: 3 },
        x.c,
      ),
    (e: any) => e.status === 400,
  );
  await assert.rejects(
    () =>
      websiteMember(
        "ops-site-save",
        "POST",
        url,
        { project_id: P, version: 2, content: content() },
        x.c,
      ),
    (e: any) => e.status === 409,
  );
  x.project.review_status = "pending";
  await assert.rejects(
    () =>
      websiteMember(
        "ops-site-publish",
        "POST",
        url,
        { project_id: P, version: 3, rights_confirmed: true },
        x.c,
      ),
    (e: any) => e.status === 403,
  );
});
test("publishing copies the saved draft while retaining the last public snapshot", async () => {
  const { c, project } = context();
  await websiteMember(
    "ops-site-publish",
    "POST",
    url,
    {
      project_id: P,
      version: 3,
      rights_confirmed: true,
      content: content("UNSAVED INJECTION"),
    },
    c,
  );
  assert.equal(project.config.website.published.headline, "PRIVATE DRAFT");
  assert.equal(
    project.config.website.previous_published.headline,
    "PUBLIC TITLE",
  );
  const r = await websitePublic("ops-site", "GET", url, c);
  assert.equal(r?.content?.headline, "PRIVATE DRAFT");
  assert.equal(r?.revision, 4);
});
test("financial evidence cannot be selected as a public website photo", async () => {
  const { c, tables } = context();
  const d = content();
  d.hero_photo.url = "/api/news?action=image&path=" + P + "/proof.jpg";
  tables.pageant_assets = [
    { id: "proof-id", project_id: P, object_path: P + "/proof.jpg" },
  ];
  tables.pageant_finance_entries = [
    { id: "ledger", proof_asset_id: "proof-id" },
  ];
  await assert.rejects(
    () =>
      websiteMember(
        "ops-site-save",
        "POST",
        url,
        { project_id: P, version: 3, content: d },
        c,
      ),
    (e: any) => e.status === 403,
  );
});
test("only approved public projects expose a website; references contain URLs, not captions", async () => {
  const { c, project } = context();
  project.public = false;
  await assert.rejects(
    () => websitePublic("ops-site", "GET", url, c),
    (e: any) => e.status === 404,
  );
  assert.deepEqual(websiteImageReferences(content()), [
    "/miss-taiwan-2027/real/official-2025.webp",
  ]);
});
