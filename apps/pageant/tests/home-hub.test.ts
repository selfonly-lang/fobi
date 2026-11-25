import test from "node:test";
import assert from "node:assert/strict";
import { inquiryDraft, pageantHomeCatalog, SELF_AI_URL, SELF_AI_ASSISTANT_URL, SHE_URL } from "../lib/home-hub.ts";
import type { Activity, Catalog } from "../lib/types.ts";

const now = Date.parse("2026-11-25T12:00:00Z");
const project = (id: string, slug: string, status: string) => ({
  id, slug, status, title: slug, year: 2027, event_date: null, venue: "", domain: "",
  summary: "", brand_id: null, sort_order: 0,
});
const activity = (id: string, project_id: string, patch: Partial<Activity> = {}): Activity => ({
  id, project_id, kind: "course", title: id, description: "", status: "open",
  starts_at: "2026-11-26T16:00:00Z", ends_at: null, timezone: "Asia/Taipei",
  venue: "", capacity: 0, amount: 0, currency: "TWD", terms: "", refund_policy: "", ...patch,
});
const catalog = (activities: Activity[]): Catalog => ({
  ok: true, brands: [], projects: [
    project("taiwan", "miss-taiwan-2027", "planning"), project("old", "fobi-2026", "archived"),
  ],
  activities, articles: [], media: [], publications: [],
});

test("only the known, free, currently open Miss Taiwan interest activity is promoted", () => {
  const id = "2218dddc-9f96-53b9-bc08-5fcfcfa7b3f3";
  const actual = activity(id, "taiwan", {kind: "pageant", starts_at:"2026-11-14T16:00:00Z"});
  assert.equal(pageantHomeCatalog(catalog([actual]), now).interest?.id, id);
  assert.deepEqual(pageantHomeCatalog(catalog([actual]), now).events, []);
  for (const changed of [
    {...actual, starts_at:"2026-12-01T00:00:00Z"},
    {...actual, ends_at:"2026-11-24T00:00:00Z"},
    {...actual, status:"closed"},
    {...actual, amount:50},
    {...actual, project_id:"old"},
  ]) assert.equal(pageantHomeCatalog(catalog([changed]), now).interest, undefined);
});

test("live activities and classes are separated; ended, unknown project and archive records do not leak", () => {
  const data = catalog([
    activity("class", "taiwan"), activity("class-later", "taiwan", { starts_at: "2026-12-30T00:00:00Z" }),
    activity("37b21910-cfa9-5bde-9db1-c6e2d18dedf5", "taiwan", { kind: "press", starts_at:"2026-11-14T16:00:00Z" }),
    activity("stale-media", "taiwan", { kind: "press", starts_at:"2026-11-14T16:00:00Z" }),
    activity("stale-course", "taiwan", { starts_at:"2026-11-14T16:00:00Z" }),
    activity("still-running", "taiwan", { kind: "final", status:"active", starts_at:"2026-11-14T16:00:00Z", ends_at:"2026-11-26T00:00:00Z" }),
    activity("archive", "old"),
    activity("unknown", "other"), activity("closed", "taiwan", {status: "closed"}),
    activity("ended", "taiwan", {ends_at: "2026-11-24T00:00:00Z"}),
  ]);
  const { courses, events } = pageantHomeCatalog(data, now);
  assert.deepEqual(courses.map((row) => row.id), ["class", "class-later"]);
  assert.deepEqual(events.map((row) => row.id), ["37b21910-cfa9-5bde-9db1-c6e2d18dedf5","still-running"]);
});

test("draft templates are distinct and cross-site links contain no query or private data", () => {
  assert.match(inquiryDraft("market", 0), /二手服裝刊登/);
  assert.match(inquiryDraft("market", 1), /二手道具刊登/);
  assert.match(inquiryDraft("market", 2), /二手服裝或道具需求/);
  assert.match(inquiryDraft("course", 1), /才藝課程合作/);
  assert.equal(new URL(SHE_URL).hostname, "she.self.com.tw");
  for (const u of [SELF_AI_URL, SELF_AI_ASSISTANT_URL].map((url) => new URL(url))) {
    assert.equal(u.hostname, "www.self.com.tw"); assert.equal(u.search, "");
  }
});
