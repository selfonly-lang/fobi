import { createClient } from "https://esm.sh/@supabase/supabase-js@2.118.0";
import {
  workflow,
  validateContent,
  checkTransition,
  effectivePublication,
  validArticleSlug,
  safeUrl,
} from "./model.js";
const URL_CORE = Deno.env.get("SUPABASE_URL")!,
  SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const db = createClient(URL_CORE, SERVICE, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const SELF = "https://llyjfsxpdylaejqlcyac.supabase.co/functions/v1";
const ORIGINS = [
  "https://pageant.self.com.tw",
  "https://fobi.self.com.tw",
  "https://misstaiwan.self.com.tw",
];
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
class Failure extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
const fail = (m: string, s = 400): never => {
  throw new Failure(m, s);
};
const id = (v: any) =>
  typeof v === "string" && UUID.test(v) ? v : fail("識別碼格式錯誤");
const str = (v: any, n = 200) =>
  typeof v === "string" && v.trim().length <= n
    ? v.trim()
    : fail("文字格式錯誤");
const integer = (v: any, min = 0, max = 100000000) =>
  Number.isInteger(v) && v >= min && v <= max ? v : fail("數字格式錯誤");
const date = (v: any) =>
  !v
    ? null
    : Number.isFinite(Date.parse(v))
      ? new Date(v).toISOString()
      : fail("日期格式錯誤");
const sha = async (v: string) =>
  Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(v)),
    ),
  )
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
const b64url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
const pkce = async (v: string) =>
  b64url(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(v)),
    ),
  );
async function result(q: any) {
  const { data, error } = await q;
  if (error) {
    console.error("pageant_core_db", error.code, error.message?.slice(0, 90));
    const m = error.message || "";
    const known: Record<string, string> = {
      sold_out: "名額已滿",
      activity_not_on_sale: "此活動目前未開放購買",
      commerce_not_enabled: "平台尚未啟用正式收款",
      terms_or_fee_not_ready: "活動條款或抽成尚未設定",
      use_free_registration: "請使用免費報名",
      ticket_already_used_or_void: "票券已使用、失效或正在退款",
      invalid_ticket: "票券不存在",
      settlement_balance_changed: "結算餘額已變更，請重新核對",
      refunds_pending: "尚有退款待處理",
      refund_exceeds_payment: "退款金額超過已付款",
      refund_not_approved: "退款尚未核准",
    };
    for (const [k, v] of Object.entries(known)) if (m.includes(k)) fail(v, 409);
    fail(
      error.code === "23505"
        ? "資料已存在，請重新整理"
        : "資料服務暫時無法使用",
      error.code === "23505" ? 409 : 503,
    );
  }
  return data;
}
async function audit(
  uid: string | null,
  action: string,
  project: string | null,
  entity: string | null,
  detail: any = {},
) {
  await result(
    db
      .from("pageant_workspace_audit")
      .insert({
        actor_id: uid,
        action,
        project_id: project,
        entity_id: entity,
        detail,
      }),
  );
}
async function publishedArticles() {
  const ids = new Set(
    (
      await result(
        db
          .from("pageant_projects")
          .select("id")
          .eq("public", true)
          .eq("review_status", "approved"),
      )
    ).map((p: any) => p.id),
  );
  const rows = await result(
    db
      .from("pageant_articles")
      .select(
        "id,project_id,slug,publication,publish_at,scheduled_publication,scheduled_at,updated_at",
      )
      .or("publication.not.is.null,scheduled_publication.not.is.null")
      .limit(500),
  );
  return rows
    .map((a: any) => ({ ...a, ...effectivePublication(a) }))
    .filter(
      (a: any) =>
        (!a.project_id || ids.has(a.project_id)) &&
        a.content &&
        a.publish_at &&
        Date.parse(a.publish_at) <= Date.now(),
    )
    .map(({ publication, scheduled_publication, scheduled_at, ...a }: any) => a)
    .sort(
      (a: any, b: any) => Date.parse(b.publish_at) - Date.parse(a.publish_at),
    );
}
async function ticketToken(t: any) {
  const secret = Deno.env.get("PAGEANT_TICKET_SECRET") || SERVICE;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode("pageant-admission-v1:" + secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return (
    t.id +
    "." +
    b64url(
      new Uint8Array(
        await crypto.subtle.sign(
          "HMAC",
          key,
          new TextEncoder().encode(t.id + ":" + t.order_id + ":" + t.user_id),
        ),
      ),
    )
  );
}
async function commerceReady() {
  const r = await result(
    db.from("pageant_settings").select("value").eq("key", "commerce").single(),
  );
  return r.value;
}
function ecpayEncode(s: string) {
  return encodeURIComponent(s)
    .replace(/%20/g, "+")
    .replace(
      /[!'()*]/g,
      (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase(),
    )
    .replace(/%2d/gi, "-")
    .replace(/%5f/gi, "_")
    .replace(/%2e/gi, ".")
    .replace(/%21/gi, "!")
    .replace(/%2a/gi, "*")
    .replace(/%28/gi, "(")
    .replace(/%29/gi, ")")
    .toLowerCase();
}
async function ecpayMac(data: Record<string, string>) {
  const sorted = Object.keys(data)
    .filter((k) => k !== "CheckMacValue")
    .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
    .map((k) => k + "=" + data[k])
    .join("&");
  return (
    await sha(
      ecpayEncode(
        "HashKey=" +
          Deno.env.get("ECPAY_HASH_KEY") +
          "&" +
          sorted +
          "&HashIV=" +
          Deno.env.get("ECPAY_HASH_IV"),
      ),
    )
  ).toUpperCase();
}
const timingEqual = (a: string, b: string) => {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
};
async function sendChannelJob(job: any) {
  const a = await result(
    db.from("pageant_articles").select("*").eq("id", job.article_id).single(),
  );
  const pub = effectivePublication(a);
  const visible =
    !a.project_id ||
    !!(await result(
      db
        .from("pageant_projects")
        .select("id")
        .eq("id", a.project_id)
        .eq("public", true)
        .eq("review_status", "approved")
        .maybeSingle(),
    ));
  if (
    !visible ||
    !pub.content ||
    !pub.publish_at ||
    Date.parse(pub.publish_at) > Date.now() ||
    (await sha(JSON.stringify(pub.content))) !== job.content_hash
  ) {
    await result(
      db
        .from("pageant_channel_jobs")
        .update({
          status: "cancelled",
          error_code: "publication_changed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", job.id),
    );
    return;
  }
  const token =
      job.channel === "facebook"
        ? Deno.env.get("PAGEANT_FACEBOOK_PAGE_TOKEN")
        : Deno.env.get("PAGEANT_LINE_CHANNEL_TOKEN"),
    page = Deno.env.get("PAGEANT_FACEBOOK_PAGE_ID");
  if (!token || (job.channel === "facebook" && !page)) {
    await result(
      db
        .from("pageant_channel_jobs")
        .update({ status: "failed", error_code: "channel_not_configured" })
        .eq("id", job.id),
    );
    return;
  }
  let response: Response;
  try {
    response =
      job.channel === "facebook"
        ? await fetch("https://graph.facebook.com/v24.0/" + page + "/feed", {
            method: "POST",
            headers: { Authorization: "Bearer " + token },
            body: new URLSearchParams({
              message: job.payload.message,
              link: job.payload.link,
            }),
            signal: AbortSignal.timeout(15000),
          })
        : await fetch("https://api.line.me/v2/bot/message/broadcast", {
            method: "POST",
            headers: {
              Authorization: "Bearer " + token,
              "Content-Type": "application/json",
              "X-Line-Retry-Key": job.id,
            },
            body: JSON.stringify({
              messages: [
                {
                  type: "text",
                  text: job.payload.message + "\n" + job.payload.link,
                },
              ],
            }),
            signal: AbortSignal.timeout(15000),
          });
  } catch {
    await result(
      db
        .from("pageant_channel_jobs")
        .update({
          status: "unknown",
          error_code: "provider_response_unknown",
          updated_at: new Date().toISOString(),
        })
        .eq("id", job.id),
    );
    return;
  }
  const d = await response.json().catch(() => ({}));
  const accepted =
    response.ok ||
    (job.channel === "line" &&
      response.status === 409 &&
      !!response.headers.get("x-line-accepted-request-id"));
  const uncertain = response.status >= 500;
  await result(
    db
      .from("pageant_channel_jobs")
      .update({
        status: accepted ? "sent" : uncertain ? "unknown" : "failed",
        public_url:
          accepted && job.channel === "facebook" && d.id
            ? "https://www.facebook.com/" + d.id
            : null,
        provider_ref:
          d.id ||
          response.headers.get("x-line-accepted-request-id") ||
          response.headers.get("x-line-request-id"),
        error_code: accepted
          ? null
          : uncertain
            ? "provider_response_unknown"
            : "provider_rejected",
        updated_at: new Date().toISOString(),
      })
      .eq("id", job.id),
  );
}
Deno.serve(async (req) => {
  const u = new URL(req.url),
    action = u.searchParams.get("action") || "catalog",
    origin = req.headers.get("origin") || "";
  const headers = {
    "Content-Type": "application/json;charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    ...(ORIGINS.includes(origin)
      ? { "Access-Control-Allow-Origin": origin, Vary: "Origin" }
      : {}),
    "Access-Control-Allow-Headers": "content-type,authorization",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  };
  const json = (s: number, d: any) =>
    new Response(JSON.stringify(d), { status: s, headers });
  if (req.method === "OPTIONS")
    return new Response(null, { status: 204, headers });
  try {
    if (origin && !ORIGINS.includes(origin)) fail("來源不允許", 403);
    let body: any = {};
    if (req.method === "POST" && action !== "payment-callback") {
      const text = await req.text();
      if (text.length > 600000) fail("資料過大", 413);
      try {
        body = JSON.parse(text);
      } catch {
        fail("資料格式錯誤");
      }
    }
    if (req.method === "GET" && action === "catalog") {
      const [
        brands,
        projects,
        activities,
        articles,
        media,
        publications,
        contestants,
        results,
        homepage,
      ] = await Promise.all([
        result(
          db
            .from("pageant_brands")
            .select(
              "id,slug,name,domain,domain_status,primary_project_id,theme",
            )
            .eq("status", "approved"),
        ),
        result(
          db
            .from("pageant_projects")
            .select(
              "id,slug,title,status,year,event_date,venue,domain,summary,brand_id,sort_order,country_code",
            )
            .eq("public", true)
            .eq("review_status", "approved")
            .order("sort_order"),
        ),
        result(
          db
            .from("pageant_activities")
            .select(
              "id,project_id,kind,title,description,status,starts_at,ends_at,timezone,venue,capacity,amount,currency,terms,refund_policy",
            )
            .in("status", ["open", "closed", "archived"])
            .order("starts_at"),
        ),
        publishedArticles(),
        result(
          db
            .from("pageant_media")
            .select("id,project_id,publication,created_at")
            .not("publication", "is", null),
        ),
        result(
          db
            .from("pageant_publications")
            .select(
              "id,project_id,slug,title,description,publication,updated_at",
            )
            .not("publication", "is", null),
        ),
        result(
          db
            .from("pageant_contestants")
            .select("id,project_id,name,country,bio,photo")
            .eq("status", "approved")
            .eq("public_consent", true),
        ),
        result(
          db
            .from("pageant_results")
            .select("activity_id,project_id,snapshot,published_at"),
        ),
        result(
          db
            .from("pageant_settings")
            .select("value")
            .eq("key", "homepage")
            .maybeSingle(),
        ),
      ]);
      const ids = new Set(projects.map((p: any) => p.id));
      const safeProjects = projects.map((p: any) => ({
        ...p,
        brand_slug: brands.find((b: any) => b.id === p.brand_id)?.slug || null,
        brand_name: brands.find((b: any) => b.id === p.brand_id)?.name || null,
        official_ready:
          brands.find((b: any) => b.id === p.brand_id)?.domain_status ===
          "verified",
        domain:
          brands.find((b: any) => b.id === p.brand_id)?.domain_status ===
          "verified"
            ? "https://" + brands.find((b: any) => b.id === p.brand_id).domain
            : "",
      }));
      return json(200, {
        ok: true,
        brands,
        projects: safeProjects,
        activities: activities.filter((a: any) => ids.has(a.project_id)),
        articles,
        media: media
          .filter((m: any) => !m.project_id || ids.has(m.project_id))
          .map((m: any) => ({
            id: m.id,
            project_id: m.project_id,
            created_at: m.created_at,
            ...m.publication,
          })),
        publications: publications
          .filter((p: any) => ids.has(p.project_id))
          .map((p: any) => ({
            ...p,
            title: p.publication.title,
            description: p.publication.description,
          })),
        contestants: contestants.filter((c: any) => ids.has(c.project_id)),
        results: results.filter((r: any) => ids.has(r.project_id)),
        home: homepage?.value || {},
      });
    }
    if (action === "domain-check" && req.method === "GET") {
      const host = u.searchParams.get("host") || "";
      if (!/^[a-z0-9-]+\.self\.com\.tw$/.test(host)) fail("網域不存在", 404);
      const b = await result(
        db
          .from("pageant_brands")
          .select("slug,domain,name,theme")
          .eq("domain", host)
          .maybeSingle(),
      );
      if (!b) fail("網域不存在", 404);
      return json(200, {
        ok: true,
        slug: b.slug,
        host: b.domain,
        name: b.name,
        wordmark: b.theme?.wordmark || b.name,
      });
    }
    if (action === "image" && req.method === "GET") {
      const path = u.searchParams.get("path") || "";
      if (!/^[a-f0-9-]+\/[a-f0-9-]+\.(jpg|png|webp)$/.test(path))
        fail("圖片不存在", 404);
      const target = "/api/news?action=image&path=" + encodeURIComponent(path);
      const [news, books, films, people] = await Promise.all([
        publishedArticles(),
        result(
          db
            .from("pageant_publications")
            .select("project_id,publication")
            .not("publication", "is", null),
        ),
        result(
          db
            .from("pageant_media")
            .select("project_id,publication")
            .not("publication", "is", null),
        ),
        result(
          db
            .from("pageant_contestants")
            .select("project_id,photo")
            .eq("status", "approved")
            .eq("public_consent", true),
        ),
      ]);
      const projects = new Set(
        (
          await result(
            db
              .from("pageant_projects")
              .select("id")
              .eq("public", true)
              .eq("review_status", "approved"),
          )
        ).map((p: any) => p.id),
      );
      if (
        !news.some((a: any) =>
          a.content.photos?.some((p: any) => p.url === target),
        ) &&
        !books.some(
          (b: any) =>
            projects.has(b.project_id) &&
            b.publication.chapters?.some((c: any) => c.photo === target),
        ) &&
        !films.some(
          (f: any) =>
            (!f.project_id || projects.has(f.project_id)) &&
            f.publication.poster === target,
        ) &&
        !people.some(
          (p: any) => projects.has(p.project_id) && p.photo === target,
        )
      )
        fail("圖片尚未公開", 404);
      const r = await db.storage
        .from("pageant-editorial")
        .createSignedUrl(path, 120);
      if (r.error) fail("圖片不存在", 404);
      return json(200, { ok: true, url: r.data.signedUrl });
    }
    if (action === "video-playback" && req.method === "GET") {
      const m = await result(
        db
          .from("pageant_media")
          .select("publication,project_id")
          .eq("id", id(u.searchParams.get("id")))
          .maybeSingle(),
      );
      if (!m?.publication) fail("影片尚未公開", 404);
      if (
        m.project_id &&
        !(await result(
          db
            .from("pageant_projects")
            .select("id")
            .eq("id", m.project_id)
            .eq("public", true)
            .eq("review_status", "approved")
            .maybeSingle(),
        ))
      )
        fail("影片尚未公開", 404);
      const p = m.publication;
      if (p.provider !== "cloudflare")
        return json(200, {
          ok: true,
          provider: p.provider,
          external_id: p.external_id,
        });
      const token = Deno.env.get("CLOUDFLARE_STREAM_API_TOKEN"),
        account = Deno.env.get("CLOUDFLARE_ACCOUNT_ID");
      if (!token || !account) fail("影片服務暫時無法使用", 503);
      const r = await fetch(
        "https://api.cloudflare.com/client/v4/accounts/" +
          account +
          "/stream/" +
          p.external_id +
          "/token",
        {
          method: "POST",
          headers: {
            Authorization: "Bearer " + token,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }),
        },
      );
      const d = await r.json();
      if (!d.success) fail("影片服務暫時無法使用", 503);
      return json(200, {
        ok: true,
        url: "https://iframe.videodelivery.net/" + d.result.token,
      });
    }
    if (action === "auth-exchange" && req.method === "POST") {
      if (
        typeof body.self_token !== "string" ||
        body.self_token.length > 12000 ||
        !/^[A-Za-z0-9_-]{43}$/.test(body.challenge || "")
      )
        fail("授權資料錯誤");
      const r = await fetch(SELF + "/oauth-userinfo", {
        headers: { Authorization: "Bearer " + body.self_token },
        signal: AbortSignal.timeout(15000),
      });
      const profile = await r.json();
      if (
        !r.ok ||
        !UUID.test(profile.sub || "") ||
        (profile.id && profile.id !== profile.sub)
      )
        fail("己美會員驗證失敗", 401);
      let link = await result(
        db
          .from("she_auth_identities")
          .select("user_id")
          .eq("provider", "self")
          .eq("subject", profile.sub)
          .maybeSingle(),
      );
      if (!link) {
        const created = await db.auth.admin.createUser({
          email: crypto.randomUUID() + "@self-pageant.invalid",
          email_confirm: true,
          user_metadata: { self_subject: profile.sub },
        });
        if (created.error || !created.data.user) fail("會員連結失敗", 503);
        const inserted = await db
          .from("she_auth_identities")
          .insert({
            provider: "self",
            subject: profile.sub,
            user_id: created.data.user.id,
          });
        if (inserted.error) {
          await db.auth.admin.deleteUser(created.data.user.id);
          link = await result(
            db
              .from("she_auth_identities")
              .select("user_id")
              .eq("provider", "self")
              .eq("subject", profile.sub)
              .maybeSingle(),
          );
          if (!link) fail("會員連結失敗", 409);
        } else {
          link = { user_id: created.data.user.id };
          await result(
            db
              .from("pageant_member_profiles")
              .upsert({
                user_id: link.user_id,
                display_name: str(profile.name || "", 160),
              }),
          );
        }
      }
      const raw = crypto.randomUUID() + crypto.randomUUID();
      await result(
        db
          .from("pageant_auth_grants")
          .insert({
            token_hash: await sha(raw),
            user_id: link.user_id,
            challenge: body.challenge,
          }),
      );
      return json(200, { ok: true, code: raw });
    }
    if (action === "auth-consume" && req.method === "POST") {
      if (
        typeof body.code !== "string" ||
        body.code.length > 200 ||
        typeof body.verifier !== "string" ||
        body.verifier.length > 160
      )
        fail("授權已失效", 401);
      const uid = await result(
        db.rpc("pageant_consume_grant", {
          p_hash: await sha(body.code),
          p_challenge: await pkce(body.verifier),
        }),
      );
      if (!uid) fail("授權已過期或已使用", 401);
      const user = await db.auth.admin.getUserById(uid);
      if (user.error || !user.data.user?.email) fail("會員不存在", 401);
      const link = await db.auth.admin.generateLink({
        type: "magiclink",
        email: user.data.user.email,
      });
      if (link.error) fail("無法建立登入", 503);
      const r = await fetch(URL_CORE + "/auth/v1/verify", {
        method: "POST",
        headers: {
          apikey: Deno.env.get("SUPABASE_ANON_KEY")!,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "magiclink",
          token_hash: link.data.properties.hashed_token,
        }),
      });
      const session = await r.json();
      if (!r.ok || session.user?.id !== uid) fail("登入失敗", 401);
      return json(200, {
        ok: true,
        session: {
          access_token: session.access_token,
          refresh_token: session.refresh_token,
        },
      });
    }
    if (action === "payment-callback" && req.method === "POST") {
      const params = Object.fromEntries(await req.formData()) as Record<
        string,
        string
      >;
      if (
        Deno.env.get("ECPAY_MODE") !== "production" ||
        params.SimulatePaid === "1"
      )
        return new Response("0|Production payment required", { status: 400 });
      const expected = await ecpayMac(params);
      if (
        !timingEqual(expected, params.CheckMacValue || "") ||
        params.MerchantID !== Deno.env.get("ECPAY_MERCHANT_ID")
      )
        return new Response("0|Invalid signature", { status: 400 });
      const o = await result(
        db
          .from("pageant_commerce_orders")
          .select("*")
          .eq("ecpay_trade_no", params.MerchantTradeNo)
          .maybeSingle(),
      );
      if (!o || Number(params.TradeAmt) !== o.amount)
        return new Response("0|Invalid order", { status: 400 });
      if (params.RtnCode === "1") {
        const tickets = [];
        for (let i = 0; i < o.quantity; i++) {
          const t = {
            id: crypto.randomUUID(),
            order_id: o.id,
            user_id: o.user_id,
          };
          tickets.push({
            ...t,
            ticket_no: o.order_no + "-" + String(i + 1).padStart(2, "0"),
            token_hash: await sha(await ticketToken(t)),
          });
        }
        await result(
          db.rpc("pageant_confirm_payment", {
            p_order: o.id,
            p_reference: params.TradeNo,
            p_amount: o.amount,
            p_event: "ecpay:" + params.TradeNo + ":paid",
            p_payload: {
              payment_type: params.PaymentType,
              payment_date: params.PaymentDate,
            },
            p_tickets: tickets,
          }),
        );
      }
      return new Response("1|OK", {
        headers: { "Content-Type": "text/plain" },
      });
    }
    if (action === "dispatch-channel-jobs" && req.method === "POST") {
      const bearer = req.headers.get("authorization") || "";
      if (!bearer.startsWith("Bearer ")) fail("未授權", 401);
      const valid = await result(
        db
          .from("pageant_service_tokens")
          .select("purpose")
          .eq("token_hash", await sha(bearer.slice(7)))
          .eq("purpose", "channel_dispatch")
          .maybeSingle(),
      );
      if (!valid) fail("未授權", 401);
      const jobs = await result(db.rpc("pageant_claim_channel_jobs"));
      await Promise.all(jobs.map(sendChannelJob));
      return json(200, { ok: true, processed: jobs.length });
    }
    const bearer = req.headers.get("authorization") || "";
    if (!bearer.startsWith("Bearer ")) fail("請先登入己美會員", 401);
    const auth = await db.auth.getUser(bearer.slice(7));
    if (auth.error || !auth.data.user) fail("登入已過期，請重新登入", 401);
    const uid = auth.data.user.id;
    const [staff, memberships] = await Promise.all([
      result(
        db.from("pageant_staff").select("*").eq("user_id", uid).maybeSingle(),
      ),
      result(db.from("pageant_project_members").select("*").eq("user_id", uid)),
    ]);
    const owner = staff?.role === "owner";
    const financial = owner || staff?.role === "finance";
    const role = (project: string | null) =>
      owner
        ? "owner"
        : project
          ? memberships.find((m: any) => m.project_id === project)?.role ||
            (staff?.role === "finance" ? "finance" : null)
          : staff?.role || null;
    const permit = (
      project: string | null,
      allowed = ["owner", "manager", "editor", "reviewer", "viewer"],
    ) => {
      if (project) id(project);
      const r = role(project);
      if (!r || !allowed.includes(r)) fail("沒有此專案的操作權限", 403);
      return r;
    };
    const financialAdmin = () => {
      if (!financial) fail("此操作需要平台財務權限", 403);
    };
    const admin = () => {
      if (!owner) fail("此操作需要平台管理員權限", 403);
    };
    const editor = ["owner", "manager", "editor"],
      reviewer = ["owner", "manager", "reviewer"];
    const normalizeImage = async (value: string, project: string | null) => {
      if (!safeUrl(value, { image: true }))
        fail("圖片網址須使用HTTPS或站內路徑");
      const url = new URL(value, "https://fobi.self.com.tw");
      if (url.pathname === "/api/news" && ORIGINS.includes(url.origin)) {
        const path = url.searchParams.get("path") || "";
        const a = await result(
          db
            .from("pageant_assets")
            .select("project_id")
            .eq("object_path", path)
            .maybeSingle(),
        );
        if (
          !a ||
          (project ? a.project_id !== project : !owner && !role(a.project_id))
        )
          fail("素材須屬於已授權的專案");
        return "/api/news?action=image&path=" + encodeURIComponent(path);
      }
      return value;
    };

    if (action === "me" && req.method === "GET") {
      const [profile, identity, bookmarks, notifications, organizations] =
        await Promise.all([
          result(
            db
              .from("pageant_member_profiles")
              .select("*")
              .eq("user_id", uid)
              .maybeSingle(),
          ),
          result(
            db
              .from("she_auth_identities")
              .select("provider")
              .eq("user_id", uid),
          ),
          result(db.from("pageant_bookmarks").select("*").eq("user_id", uid)),
          result(
            db
              .from("pageant_notifications")
              .select("*")
              .eq("user_id", uid)
              .order("created_at", { ascending: false })
              .limit(100),
          ),
          result(
            db.from("pageant_organizations").select("*").eq("owner_id", uid),
          ),
        ]);
      return json(200, {
        ok: true,
        user: {
          id: uid,
          email: auth.data.user.email?.endsWith("@self-pageant.invalid")
            ? null
            : auth.data.user.email,
        },
        profile: profile || { display_name: staff?.display_name || "" },
        identities: identity.map((i: any) => i.provider),
        role: staff?.role || "member",
        memberships,
        bookmarks,
        notifications,
        organizations,
      });
    }
    if (action === "save-profile" && req.method === "POST") {
      const links = body.links || {};
      for (const v of Object.values(links))
        if (v && !safeUrl(v)) fail("連結須使用HTTPS網址");
      await result(
        db
          .from("pageant_member_profiles")
          .upsert({
            user_id: uid,
            display_name: str(body.display_name, 160),
            country: str(body.country || "", 100),
            bio: str(body.bio || "", 2000),
            links,
            updated_at: new Date().toISOString(),
          }),
      );
      return json(200, { ok: true });
    }
    if (action === "bookmark" && req.method === "POST") {
      if (!["article", "project", "media"].includes(body.type))
        fail("收藏類型錯誤");
      id(body.id);
      if (body.remove)
        await result(
          db
            .from("pageant_bookmarks")
            .delete()
            .eq("user_id", uid)
            .eq("resource_type", body.type)
            .eq("resource_id", body.id),
        );
      else
        await result(
          db
            .from("pageant_bookmarks")
            .upsert({
              user_id: uid,
              resource_type: body.type,
              resource_id: body.id,
            }),
        );
      return json(200, { ok: true });
    }
    if (action === "notification-read" && req.method === "POST") {
      await result(
        db
          .from("pageant_notifications")
          .update({ read_at: new Date().toISOString() })
          .eq("id", id(body.id))
          .eq("user_id", uid),
      );
      return json(200, { ok: true });
    }
    if (action === "projects" && req.method === "GET") {
      let q = db
        .from("pageant_projects")
        .select("*")
        .order("sort_order")
        .order("created_at");
      if (!owner && !financial)
        q = q.in(
          "id",
          memberships.map((m: any) => m.project_id),
        );
      return json(200, {
        ok: true,
        projects: await result(q),
        role: staff?.role || "member",
      });
    }
    if (action === "organization" && req.method === "POST") {
      const data = {
        owner_id: uid,
        name: str(body.name, 160),
        contact: {
          name: str(body.contact_name || "", 120),
          email: str(body.email || "", 254),
          phone: str(body.phone || "", 60),
        },
      };
      if (!data.name) fail("請填寫主辦單位名稱");
      const organization = await result(
        db.from("pageant_organizations").insert(data).select().single(),
      );
      return json(200, { ok: true, organization });
    }
    if (action === "create-project" && req.method === "POST") {
      const count = await result(
        db
          .from("pageant_projects")
          .select("id")
          .eq("created_by", uid)
          .gte("created_at", new Date(Date.now() - 86400000).toISOString()),
      );
      if (count.length >= 10) fail("今日建立專案已達上限", 429);
      const title = str(body.title);
      if (!title) fail("請填寫活動名稱");
      const slug = str(
        body.slug || "event-" + crypto.randomUUID().slice(0, 12),
        80,
      );
      if (!/^[a-z0-9][a-z0-9-]{1,79}$/.test(slug))
        fail("活動代稱須用小寫英文及數字");
      const p = await result(
        db.rpc("pageant_start_project", {
          p_actor: uid,
          p_org: id(body.organization_id),
          p_data: {
            title,
            slug,
            year: integer(body.year || new Date().getFullYear(), 2020, 2200),
            summary: str(body.summary || "", 3000),
            venue: str(body.venue || "", 500),
            event_date: body.event_date || null,
          },
          p_tasks: workflow("00000000-0000-4000-8000-000000000000"),
        }),
      );
      return json(200, { ok: true, project: p });
    }
    if (action === "submit-project" && req.method === "POST") {
      permit(body.id, ["owner", "manager"]);
      const p = await result(
        db
          .from("pageant_projects")
          .update({ review_status: "pending" })
          .eq("id", id(body.id))
          .select()
          .single(),
      );
      await audit(uid, "submit_project", p.id, p.id);
      return json(200, { ok: true, project: p });
    }
    if (action === "review-project" && req.method === "POST") {
      admin();
      if (!["approved", "rejected"].includes(body.status)) fail("審核狀態錯誤");
      const p = await result(
        db
          .from("pageant_projects")
          .update({
            review_status: body.status,
            public: body.status === "approved",
          })
          .eq("id", id(body.id))
          .select()
          .single(),
      );
      if (p.organization_id && body.status === "approved")
        await result(
          db
            .from("pageant_organizations")
            .update({ status: "verified" })
            .eq("id", p.organization_id),
        );
      await audit(uid, "review_project", p.id, p.id, {
        status: body.status,
        note: str(body.note || "", 3000),
      });
      return json(200, { ok: true, project: p });
    }
    if (action === "workspace" && req.method === "GET") {
      const project = id(u.searchParams.get("project"));
      const r = permit(project, [
        "owner",
        "manager",
        "editor",
        "reviewer",
        "viewer",
        "judge",
        "finance",
        "checkin",
      ]);
      if (["judge", "finance", "checkin"].includes(r))
        return json(200, {
          ok: true,
          role: r,
          activities: await result(
            db
              .from("pageant_activities")
              .select("id,project_id,title,kind,status,starts_at")
              .eq("project_id", project),
          ),
          items: [],
          proposals: [],
          media: [],
          publications: [],
          articles: [],
          members: [],
          assets:
            r === "finance"
              ? await result(
                  db
                    .from("pageant_assets")
                    .select("*")
                    .eq("project_id", project),
                )
              : [],
          audits: [],
          registrations: [],
        });
      const [
        activities,
        items,
        proposals,
        media,
        publications,
        articles,
        members,
        assets,
        audits,
        registrations,
      ] = await Promise.all([
        result(
          db
            .from("pageant_activities")
            .select("*")
            .eq("project_id", project)
            .order("starts_at"),
        ),
        result(
          db
            .from("pageant_work_items")
            .select("*")
            .eq("project_id", project)
            .order("created_at")
            .limit(2000),
        ),
        result(
          db
            .from("pageant_proposals")
            .select("*")
            .eq("project_id", project)
            .order("updated_at", { ascending: false }),
        ),
        result(
          db
            .from("pageant_media")
            .select("*")
            .eq("project_id", project)
            .order("created_at", { ascending: false }),
        ),
        result(
          db.from("pageant_publications").select("*").eq("project_id", project),
        ),
        result(
          db
            .from("pageant_articles")
            .select(
              "id,slug,title,status,version,publish_at,scheduled_at,updated_at",
            )
            .eq("project_id", project)
            .order("updated_at", { ascending: false }),
        ),
        result(
          db
            .from("pageant_project_members")
            .select("*")
            .eq("project_id", project),
        ),
        result(db.from("pageant_assets").select("*").eq("project_id", project)),
        result(
          db
            .from("pageant_workspace_audit")
            .select("*")
            .eq("project_id", project)
            .order("created_at", { ascending: false })
            .limit(60),
        ),
        result(
          db
            .from("pageant_registrations")
            .select(
              "*,activity:pageant_activities!inner(project_id,title,kind)",
            )
            .eq("activity.project_id", project)
            .limit(1000),
        ),
      ]);
      return json(200, {
        ok: true,
        role: r,
        activities,
        items,
        proposals,
        media,
        publications,
        articles,
        members,
        assets,
        audits,
        registrations,
      });
    }
    if (action === "save-activity" && req.method === "POST") {
      const project = id(body.project_id);
      permit(project, editor);
      if (
        ![
          "pageant",
          "course",
          "training",
          "press",
          "segment",
          "final",
          "party",
        ].includes(body.kind) ||
        ![
          "draft",
          "pending",
          "open",
          "closed",
          "cancelled",
          "archived",
        ].includes(body.status)
      )
        fail("活動類型或狀態錯誤");
      const starts = date(body.starts_at),
        ends = date(body.ends_at);
      if (starts && ends && ends <= starts) fail("結束時間須晚於開始時間");
      try {
        new Intl.DateTimeFormat("en", {
          timeZone: body.timezone || "Asia/Taipei",
        });
      } catch {
        fail("時區錯誤");
      }
      if (body.status === "open") {
        const p = await result(
          db
            .from("pageant_projects")
            .select("status,review_status")
            .eq("id", project)
            .single(),
        );
        if (
          p.review_status !== "approved" ||
          ["closed", "archived"].includes(p.status) ||
          !starts ||
          !body.terms ||
          !body.refund_policy
        )
          fail("請先完成專案審核、日期及條款，已結案活動不可開賣");
      }
      const data = {
        project_id: project,
        kind: body.kind,
        title: str(body.title),
        description: str(body.description || "", 10000),
        status: body.status,
        starts_at: starts,
        ends_at: ends,
        timezone: body.timezone || "Asia/Taipei",
        venue: str(body.venue || "", 500),
        capacity: integer(body.capacity || 0),
        amount: integer(body.amount || 0),
        fee_kind:
          body.kind === "course" || body.kind === "training"
            ? "course"
            : body.fee_kind === "sponsor"
              ? "sponsor"
              : "ticket",
        terms: str(body.terms || "", 8000),
        refund_policy: str(body.refund_policy || "", 8000),
        config: body.config || {},
      };
      if (!data.title) fail("請填活動名稱");
      const activity = body.id
        ? await result(
            db
              .from("pageant_activities")
              .update({
                ...data,
                version: integer(body.version, 1) + 1,
                updated_at: new Date().toISOString(),
              })
              .eq("id", id(body.id))
              .eq("project_id", project)
              .eq("version", body.version)
              .select()
              .maybeSingle(),
          )
        : await result(
            db
              .from("pageant_activities")
              .insert({ ...data, created_by: uid })
              .select()
              .single(),
          );
      if (!activity) fail("活動已被其他人更新", 409);
      await audit(uid, "activity_saved", project, activity.id, {
        title: activity.title,
      });
      return json(200, { ok: true, activity });
    }
    if (action === "register" && req.method === "POST") {
      const a = await result(
        db
          .from("pageant_activities")
          .select(
            "*,project:pageant_projects!inner(status,review_status,public)",
          )
          .eq("id", id(body.activity_id))
          .single(),
      );
      if (
        a.status !== "open" ||
        a.amount > 0 ||
        !a.project.public ||
        a.project.review_status !== "approved" ||
        ["closed", "archived"].includes(a.project.status)
      )
        fail("此活動未開放免費報名");
      if (body.consent !== true) fail("請同意報名資料使用及活動條款");
      const profile = {
        name: str(body.name, 160),
        email: str(body.email || "", 254),
        phone: str(body.phone || "", 60),
        country: str(body.country || "", 100),
        note: str(body.note || "", 3000),
      };
      if (!profile.name) fail("請填姓名");
      const registration = await result(
        db.rpc("pageant_register_free", {
          p_actor: uid,
          p_activity: a.id,
          p_profile: profile,
        }),
      );
      return json(200, { ok: true, registration });
    }
    if (action === "review-registration" && req.method === "POST") {
      const r = await result(
        db
          .from("pageant_registrations")
          .select("*,activity:pageant_activities!inner(project_id)")
          .eq("id", id(body.id))
          .single(),
      );
      permit(
        r.activity.project_id,
        body.status === "attended"
          ? ["owner", "manager", "editor", "checkin"]
          : editor,
      );
      if (
        !["approved", "rejected", "attended", "cancelled"].includes(body.status)
      )
        fail("報名狀態錯誤");
      await result(
        db
          .from("pageant_registrations")
          .update({ status: body.status })
          .eq("id", r.id),
      );
      await audit(uid, "registration_updated", r.activity.project_id, r.id, {
        status: body.status,
      });
      return json(200, { ok: true });
    }
    if (action === "save-proposal" && req.method === "POST") {
      const project = id(body.project_id);
      permit(project, editor);
      if (
        !["proposal", "sponsor", "report"].includes(body.kind) ||
        !["draft", "review", "approved", "accepted", "delivered"].includes(
          body.status,
        )
      )
        fail("提案格式錯誤");
      if (JSON.stringify(body.content).length > 120000) fail("提案過大");
      const data = {
        project_id: project,
        title: str(body.title),
        kind: body.kind,
        status: body.status,
        content: body.content || {},
        updated_by: uid,
        updated_at: new Date().toISOString(),
      };
      const proposal = body.id
        ? await result(
            db
              .from("pageant_proposals")
              .update({ ...data, version: integer(body.version, 1) + 1 })
              .eq("id", id(body.id))
              .eq("project_id", project)
              .eq("version", body.version)
              .select()
              .maybeSingle(),
          )
        : await result(
            db
              .from("pageant_proposals")
              .insert({ ...data, created_by: uid })
              .select()
              .single(),
          );
      if (!proposal) fail("提案已被其他人更新", 409);
      await audit(uid, "proposal_saved", project, proposal.id, {
        title: proposal.title,
      });
      return json(200, { ok: true, proposal });
    }
    if (action === "article-get" && req.method === "GET") {
      const article = await result(
        db
          .from("pageant_articles")
          .select("*")
          .eq("id", id(u.searchParams.get("id")))
          .single(),
      );
      permit(article.project_id);
      const versions = await result(
        db
          .from("pageant_article_versions")
          .select("id,version,created_at,actor_id")
          .eq("article_id", article.id)
          .order("version", { ascending: false })
          .limit(60),
      );
      return json(200, { ok: true, article, versions });
    }
    if (action === "article-save" && req.method === "POST") {
      const project = body.project_id ? id(body.project_id) : null;
      permit(project, editor);
      const content = validateContent(body.content);
      for (const p of content.photos)
        p.url = await normalizeImage(p.url, project);
      let existing = null;
      if (body.id) {
        existing = await result(
          db
            .from("pageant_articles")
            .select("*")
            .eq("id", id(body.id))
            .maybeSingle(),
        );
        if (!existing || existing.project_id !== project)
          fail("新聞不存在", 404);
      }
      for (const photo of content.photos) {
        const url = new URL(photo.url, "https://fobi.self.com.tw");
        if (url.pathname === "/api/news" && ORIGINS.includes(url.origin)) {
          const path = url.searchParams.get("path") || "";
          const asset = await result(
            db
              .from("pageant_assets")
              .select("project_id")
              .eq("object_path", path)
              .maybeSingle(),
          );
          if (
            !asset ||
            (project
              ? asset.project_id !== project
              : !owner && !role(asset.project_id))
          )
            fail("圖片必須來自已授權的專案");
        }
      }
      const slug = existing?.slug || body.slug;
      if (!validArticleSlug(slug)) fail("新聞代稱格式錯誤或為系統保留名稱");
      const current = effectivePublication(existing);
      const data = {
        project_id: project,
        slug,
        title: content.title,
        content,
        status: "draft",
        publication: current.content,
        publish_at: current.publish_at,
        scheduled_publication: null,
        scheduled_at: null,
        updated_by: uid,
      };
      const article = existing
        ? await result(
            db
              .from("pageant_articles")
              .update(data)
              .eq("id", existing.id)
              .eq("version", body.version)
              .select()
              .maybeSingle(),
          )
        : await result(
            db
              .from("pageant_articles")
              .insert({ ...data, created_by: uid })
              .select()
              .single(),
          );
      if (!article) fail("新聞已被其他人更新", 409);
      return json(200, { ok: true, article });
    }
    if (action === "article-transition" && req.method === "POST") {
      const a = await result(
        db.from("pageant_articles").select("*").eq("id", id(body.id)).single(),
      );
      const r = permit(a.project_id, [
        "owner",
        "manager",
        "editor",
        "reviewer",
      ]);
      checkTransition(a.status, body.status, r, body.publish_at);
      const current = effectivePublication(a);
      const data: any = { status: body.status, updated_by: uid };
      if (body.status === "draft")
        Object.assign(data, {
          publication: current.content,
          publish_at: current.publish_at,
          scheduled_publication: null,
          scheduled_at: null,
        });
      if (["published", "scheduled"].includes(body.status)) {
        validateContent(a.content);
        if (!a.content.sections.length && !a.content.facts?.length)
          fail("新聞須有內文");
        if (
          !a.content.photos.length ||
          a.content.photos.some((p: any) => !p.caption?.trim() || !p.source)
        )
          fail("發布前請補齊圖說與來源");
        if (body.status === "scheduled")
          Object.assign(data, {
            publication: current.content,
            publish_at: current.publish_at,
            scheduled_publication: a.content,
            scheduled_at: date(body.publish_at),
          });
        else
          Object.assign(data, {
            publication: a.content,
            publish_at: new Date().toISOString(),
            scheduled_publication: null,
            scheduled_at: null,
          });
      }
      if (body.status === "withdrawn")
        Object.assign(data, {
          publication: null,
          publish_at: null,
          scheduled_publication: null,
          scheduled_at: null,
        });
      const article = await result(
        db
          .from("pageant_articles")
          .update(data)
          .eq("id", a.id)
          .eq("version", body.version)
          .select()
          .maybeSingle(),
      );
      if (!article) fail("新聞已被其他人更新", 409);
      return json(200, { ok: true, article });
    }
    if (action === "article-restore" && req.method === "POST") {
      const a = await result(
        db.from("pageant_articles").select("*").eq("id", id(body.id)).single(),
      );
      permit(a.project_id, editor);
      const v = await result(
        db
          .from("pageant_article_versions")
          .select("snapshot")
          .eq("article_id", a.id)
          .eq("version", body.restore_version)
          .single(),
      );
      const p = effectivePublication(a);
      const article = await result(
        db
          .from("pageant_articles")
          .update({
            title: v.snapshot.title,
            content: v.snapshot.content,
            status: "draft",
            publication: p.content,
            publish_at: p.publish_at,
            scheduled_at: null,
            scheduled_publication: null,
            updated_by: uid,
          })
          .eq("id", a.id)
          .eq("version", body.version)
          .select()
          .maybeSingle(),
      );
      if (!article) fail("新聞已被其他人更新", 409);
      return json(200, { ok: true, article });
    }
    if (action === "platform-articles" && req.method === "GET") {
      permit(null, ["owner", "manager", "editor", "reviewer"]);
      return json(200, {
        ok: true,
        articles: await result(
          db
            .from("pageant_articles")
            .select(
              "id,slug,title,status,version,publish_at,scheduled_at,updated_at",
            )
            .is("project_id", null)
            .order("updated_at", { ascending: false }),
        ),
      });
    }
    if (action === "save-media" && req.method === "POST") {
      const project = body.project_id ? id(body.project_id) : null;
      permit(project, editor);
      if (
        !["short", "interview", "highlight", "show"].includes(body.kind) ||
        !["youtube", "vimeo", "cloudflare"].includes(body.provider) ||
        !["draft", "review"].includes(body.status)
      )
        fail("影片格式錯誤");
      const external = str(body.external_id, 200);
      if (
        (body.provider === "youtube" &&
          !/^[A-Za-z0-9_-]{11}$/.test(external)) ||
        (body.provider === "vimeo" && !/^\d+$/.test(external)) ||
        (body.provider === "cloudflare" && !/^[a-f0-9]{32}$/.test(external))
      )
        fail("影片識別碼錯誤");
      if (body.poster) body.poster = await normalizeImage(body.poster, project);
      if (!safeUrl(body.source)) fail("請填寫影片來源");
      const data = {
        project_id: project,
        title: str(body.title),
        description: str(body.description || "", 6000),
        kind: body.kind,
        provider: body.provider,
        external_id: external,
        poster: body.poster || "",
        caption: str(body.caption || "", 2000),
        source: body.source,
        rights_confirmed: body.rights_confirmed === true,
        status: body.status,
        updated_at: new Date().toISOString(),
      };
      const media = body.id
        ? await result(
            db
              .from("pageant_media")
              .update(data)
              .eq("id", id(body.id))
              .eq("project_id", project)
              .select()
              .maybeSingle(),
          )
        : await result(
            db
              .from("pageant_media")
              .insert({
                ...data,
                processing_status:
                  body.provider === "cloudflare" ? "processing" : "ready",
                created_by: uid,
              })
              .select()
              .single(),
          );
      if (!media) fail("影片不存在", 404);
      await audit(uid, "media_saved", project, media.id);
      return json(200, { ok: true, media });
    }
    if (action === "review-media" && req.method === "POST") {
      const m = await result(
        db.from("pageant_media").select("*").eq("id", id(body.id)).single(),
      );
      permit(m.project_id, reviewer);
      if (!["published", "withdrawn", "draft"].includes(body.status))
        fail("影片狀態錯誤");
      if (
        body.status === "published" &&
        (!m.rights_confirmed || m.processing_status !== "ready")
      )
        fail("影片須取得授權且完成轉檔");
      await result(
        db
          .from("pageant_media")
          .update({
            status: body.status,
            ...(body.status === "published"
              ? {
                  publication: {
                    title: m.title,
                    description: m.description,
                    kind: m.kind,
                    provider: m.provider,
                    external_id: m.external_id,
                    poster: m.poster,
                    caption: m.caption,
                    source: m.source,
                  },
                }
              : body.status === "withdrawn"
                ? { publication: null }
                : {}),
            updated_at: new Date().toISOString(),
          })
          .eq("id", m.id),
      );
      await audit(uid, "media_reviewed", m.project_id, m.id, {
        status: body.status,
      });
      return json(200, { ok: true });
    }
    if (action === "video-upload-url" && req.method === "POST") {
      const project = id(body.project_id);
      permit(project, editor);
      const token = Deno.env.get("CLOUDFLARE_STREAM_API_TOKEN"),
        account = Deno.env.get("CLOUDFLARE_ACCOUNT_ID");
      if (!token || !account)
        fail("自有影片服務尚未設定，您仍可加入已授權的外部影片", 503);
      const r = await fetch(
        "https://api.cloudflare.com/client/v4/accounts/" +
          account +
          "/stream/direct_upload",
        {
          method: "POST",
          headers: {
            Authorization: "Bearer " + token,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            maxDurationSeconds: integer(body.max_duration || 1800, 1, 7200),
            requireSignedURLs: true,
            meta: { project_id: project, title: str(body.title) },
          }),
        },
      );
      const d = await r.json();
      if (!r.ok || !d.success) fail("影片上傳服務暫時無法使用", 503);
      const media = await result(
        db
          .from("pageant_media")
          .insert({
            project_id: project,
            title: str(body.title),
            kind: body.kind || "highlight",
            provider: "cloudflare",
            external_id: d.result.uid,
            source: "https://pageant.self.com.tw/tv",
            processing_status: "pending",
            rights_confirmed: body.rights_confirmed === true,
            created_by: uid,
          })
          .select()
          .single(),
      );
      return json(200, { ok: true, upload_url: d.result.uploadURL, media });
    }
    if (action === "video-sync" && req.method === "POST") {
      const m = await result(
        db.from("pageant_media").select("*").eq("id", id(body.id)).single(),
      );
      permit(m.project_id, editor);
      if (m.provider !== "cloudflare") fail("此影片不需轉檔");
      const token = Deno.env.get("CLOUDFLARE_STREAM_API_TOKEN"),
        account = Deno.env.get("CLOUDFLARE_ACCOUNT_ID");
      if (!token || !account) fail("影片服務尚未設定", 503);
      const r = await fetch(
        "https://api.cloudflare.com/client/v4/accounts/" +
          account +
          "/stream/" +
          m.external_id,
        { headers: { Authorization: "Bearer " + token } },
      );
      const d = await r.json();
      if (!d.success) fail("無法讀取影片處理狀態", 503);
      const status = d.result.readyToStream
        ? "ready"
        : d.result.status?.state === "error"
          ? "failed"
          : "processing";
      await result(
        db
          .from("pageant_media")
          .update({ processing_status: status })
          .eq("id", m.id),
      );
      return json(200, { ok: true, status });
    }
    if (action === "save-publication" && req.method === "POST") {
      const project = id(body.project_id);
      permit(project, editor);
      if (
        !validArticleSlug(body.slug) ||
        !Array.isArray(body.chapters) ||
        body.chapters.length > 80
      )
        fail("會刊格式錯誤");
      for (const chapter of body.chapters) {
        if (
          typeof chapter.heading !== "string" ||
          !Array.isArray(chapter.paragraphs) ||
          chapter.paragraphs.some(
            (p: any) => typeof p !== "string" || p.length > 12000,
          )
        )
          fail("會刊章節錯誤");
        if (chapter.photo)
          chapter.photo = await normalizeImage(chapter.photo, project);
      }
      const stable = body.id
        ? await result(
            db
              .from("pageant_publications")
              .select("slug,project_id")
              .eq("id", id(body.id))
              .single(),
          )
        : null;
      if (stable && stable.project_id !== project) fail("會刊不存在", 404);
      const data = {
        project_id: project,
        slug: stable?.slug || body.slug,
        title: str(body.title),
        description: str(body.description || "", 1500),
        chapters: body.chapters,
        status: "draft",
        updated_by: uid,
        updated_at: new Date().toISOString(),
      };
      const publication = body.id
        ? await result(
            db
              .from("pageant_publications")
              .update({ ...data, version: integer(body.version, 1) + 1 })
              .eq("id", id(body.id))
              .eq("project_id", project)
              .eq("version", body.version)
              .select()
              .maybeSingle(),
          )
        : await result(
            db
              .from("pageant_publications")
              .insert({ ...data, created_by: uid })
              .select()
              .single(),
          );
      if (!publication) fail("會刊已被其他人更新", 409);
      return json(200, { ok: true, publication });
    }
    if (action === "review-publication" && req.method === "POST") {
      const p = await result(
        db
          .from("pageant_publications")
          .select("*")
          .eq("id", id(body.id))
          .single(),
      );
      permit(p.project_id, reviewer);
      if (!["published", "withdrawn", "review"].includes(body.status))
        fail("會刊狀態錯誤");
      if (body.status === "published" && body.content_confirmed !== true)
        fail("請確認會刊只包含已核准公開的內容");
      if (
        body.status === "published" &&
        p.chapters.some((c: any) => c.photo && !c.caption)
      )
        fail("有圖片的會刊章節須填寫圖說及來源");
      if (body.status === "published" && !p.chapters.length)
        fail("請先加入確認過的會刊內容");
      await result(
        db
          .from("pageant_publications")
          .update({
            updated_by: uid,
            status: body.status,
            ...(body.status === "published"
              ? {
                  publication: {
                    title: p.title,
                    description: p.description,
                    chapters: p.chapters,
                    version: p.version,
                  },
                }
              : body.status === "withdrawn"
                ? { publication: null }
                : {}),
            updated_at: new Date().toISOString(),
          })
          .eq("id", p.id)
          .eq("version", body.version)
          .select()
          .single(),
      );
      await audit(uid, "publication_reviewed", p.project_id, p.id, {
        status: body.status,
      });
      return json(200, { ok: true });
    }
    if (action === "wallet" && req.method === "GET") {
      const [orders, tickets, registrations] = await Promise.all([
        result(
          db
            .from("pageant_commerce_orders")
            .select("*,activity:pageant_activities(title,kind,starts_at,venue)")
            .eq("user_id", uid)
            .order("created_at", { ascending: false }),
        ),
        result(
          db
            .from("pageant_admissions")
            .select("*,order:pageant_commerce_orders(order_no,activity_id)")
            .eq("user_id", uid),
        ),
        result(
          db
            .from("pageant_registrations")
            .select("*,activity:pageant_activities(title,kind,starts_at,venue)")
            .eq("user_id", uid),
        ),
      ]);
      const admissions = [];
      for (const t of tickets) {
        const { token_hash, ...safe } = t;
        admissions.push({ ...safe, qr_token: await ticketToken(t) });
      }
      return json(200, {
        ok: true,
        orders,
        tickets: admissions,
        registrations,
      });
    }
    if (action === "create-order" && req.method === "POST") {
      if (body.terms_accepted !== true) fail("請同意活動與退款條款");
      const o = await result(
        db.rpc("pageant_reserve_order", {
          p_actor: uid,
          p_activity: id(body.activity_id),
          p_quantity: integer(body.quantity, 1, 10),
          p_key: id(body.idempotency_key),
        }),
      );
      if (body.buyer_info) {
        const b = body.buyer_info;
        const buyer = {
          name: str(b.name || "", 160),
          email: str(b.email || "", 254),
          phone: str(b.phone || "", 60),
        };
        if (buyer.email && !/^\S+@\S+\.\S+$/.test(buyer.email))
          fail("聯絡Email格式錯誤");
        await result(
          db
            .from("pageant_commerce_orders")
            .update({ buyer_info: buyer })
            .eq("id", o.id)
            .eq("user_id", uid)
            .eq("status", "pending"),
        );
      }
      return json(200, { ok: true, order: o });
    }
    if (action === "payment-form" && req.method === "POST") {
      const o = await result(
        db
          .from("pageant_commerce_orders")
          .select("*,activity:pageant_activities(title)")
          .eq("id", id(body.order_id))
          .eq("user_id", uid)
          .single(),
      );
      if (o.status !== "pending" || Date.parse(o.expires_at) < Date.now())
        fail("訂單已過期或已付款", 409);
      if (
        Deno.env.get("ECPAY_MODE") !== "production" ||
        !Deno.env.get("ECPAY_MERCHANT_ID") ||
        !Deno.env.get("ECPAY_HASH_KEY") ||
        !Deno.env.get("ECPAY_HASH_IV")
      )
        fail("正式金流尚未就緒", 503);
      const cfg = await commerceReady();
      if (!cfg.enabled || !cfg.merchant_reviewed) fail("正式收款尚未啟用", 503);
      const taipei = new Date(Date.now() + 8 * 3600000)
        .toISOString()
        .slice(0, 19)
        .replace("T", " ")
        .replaceAll("-", "/");
      const fields: Record<string, string> = {
        MerchantID: Deno.env.get("ECPAY_MERCHANT_ID")!,
        MerchantTradeNo: o.ecpay_trade_no,
        MerchantTradeDate: taipei,
        PaymentType: "aio",
        TotalAmount: String(o.amount),
        TradeDesc: "SELF PAGEANT 活動購票",
        ItemName: o.activity.title.slice(0, 150),
        ReturnURL:
          URL_CORE + "/functions/v1/pageant-core?action=payment-callback",
        ChoosePayment: "Credit",
        EncryptType: "1",
        ClientBackURL: "https://pageant.self.com.tw/account?tab=tickets",
        OrderResultURL: "https://pageant.self.com.tw/payment-result",
        NeedExtraPaidInfo: "Y",
        CustomField1: o.id,
      };
      fields.CheckMacValue = await ecpayMac(fields);
      await audit(uid, "payment_started", o.project_id, o.id);
      return json(200, {
        ok: true,
        url: "https://payment.ecpay.com.tw/Cashier/AioCheckOut/V5",
        fields,
      });
    }
    if (action === "request-refund" && req.method === "POST") {
      const o = await result(
        db
          .from("pageant_commerce_orders")
          .select("*")
          .eq("id", id(body.order_id))
          .single(),
      );
      if (o.user_id !== uid) permit(o.project_id, ["owner", "manager"]);
      const refund = await result(
        db.rpc("pageant_request_refund", {
          p_actor: uid,
          p_order: o.id,
          p_quantity: integer(body.quantity, 1, 10),
          p_reason: str(body.reason, 2000),
        }),
      );
      return json(200, { ok: true, refund });
    }
    if (action === "review-refund" && req.method === "POST") {
      financialAdmin();
      if (!["approved", "rejected"].includes(body.status)) fail("退款狀態錯誤");
      await result(
        db.rpc("pageant_review_refund", {
          p_id: id(body.id),
          p_status: body.status,
        }),
      );
      await audit(uid, "refund_reviewed", null, body.id, {
        status: body.status,
      });
      return json(200, { ok: true });
    }
    if (action === "execute-refund" && req.method === "POST") {
      financialAdmin();
      const r = await result(
        db
          .from("pageant_refunds")
          .select("*,order:pageant_commerce_orders(*)")
          .eq("id", id(body.id))
          .single(),
      );
      if (r.status !== "approved") fail("退款尚未核准");
      const payment = await result(
        db
          .from("pageant_payment_events")
          .select("payload,provider_event")
          .eq("order_id", r.order_id)
          .eq("kind", "payment")
          .single(),
      );
      if (!String(payment.payload.payment_type).startsWith("Credit"))
        fail("此付款方式需人工退款並附上匯款證明");
      const fields: Record<string, string> = {
        MerchantID: Deno.env.get("ECPAY_MERCHANT_ID") || "",
        MerchantTradeNo: r.order.ecpay_trade_no,
        TradeNo: payment.provider_event.split(":")[1],
        Action: "R",
        TotalAmount: String(r.amount),
      };
      fields.CheckMacValue = await ecpayMac(fields);
      const reserved = await result(
        db
          .from("pageant_refunds")
          .update({
            status: "processing",
            updated_at: new Date().toISOString(),
          })
          .eq("id", r.id)
          .eq("status", "approved")
          .select("id")
          .maybeSingle(),
      );
      if (!reserved) fail("退款已在處理中，請先核對商店紀錄", 409);
      const response = await fetch(
        "https://payment.ecpay.com.tw/CreditDetail/DoAction",
        {
          method: "POST",
          body: new URLSearchParams(fields),
          signal: AbortSignal.timeout(20000),
        },
      );
      const text = await response.text();
      let data: any;
      try {
        data = JSON.parse(text);
      } catch {
        data = Object.fromEntries(new URLSearchParams(text));
      }
      if (String(data.RtnCode) !== "1") {
        await result(
          db
            .from("pageant_refunds")
            .update({ status: "failed" })
            .eq("id", r.id),
        );
        fail("綠界尚未確認退款完成，請核對商店後台再處理", 502);
      }
      const completed = await result(
        db.rpc("pageant_complete_refund", {
          p_refund: r.id,
          p_reference: "ECPAY:" + fields.TradeNo + ":" + r.id,
          p_actor: uid,
        }),
      );
      await audit(uid, "refund_completed", r.order.project_id, r.id);
      return json(200, { ok: true, result: completed });
    }
    if (action === "confirm-manual-refund" && req.method === "POST") {
      financialAdmin();
      const r = await result(
        db.from("pageant_refunds").select("*").eq("id", id(body.id)).single(),
      );
      if (!body.proof_asset_id) fail("請上傳實際退款證明");
      const o = await result(
        db
          .from("pageant_commerce_orders")
          .select("project_id")
          .eq("id", r.order_id)
          .single(),
      );
      const asset = await result(
        db
          .from("pageant_assets")
          .select("id")
          .eq("id", id(body.proof_asset_id))
          .eq("project_id", o.project_id)
          .maybeSingle(),
      );
      if (!asset) fail("退款證明須屬於同一專案");
      const d = await result(
        db.rpc("pageant_complete_refund", {
          p_refund: r.id,
          p_reference: str(body.reference, 200),
          p_actor: uid,
        }),
      );
      await result(
        db
          .from("pageant_finance_entries")
          .update({ proof_asset_id: asset.id })
          .eq("source_key", "refund:" + r.id),
      );
      await audit(uid, "manual_refund_completed", o.project_id, r.id, {
        proof_asset_id: asset.id,
      });
      return json(200, { ok: true, result: d });
    }
    if (action === "checkin" && req.method === "POST") {
      const hash = await sha(str(body.token, 400));
      const t = await result(
        db
          .from("pageant_admissions")
          .select("id,order:pageant_commerce_orders!inner(project_id)")
          .eq("token_hash", hash)
          .maybeSingle(),
      );
      if (!t) fail("無效票券", 404);
      if (id(body.project_id) !== t.order.project_id)
        fail("此票券不屬於目前專案", 403);
      permit(t.order.project_id, ["owner", "manager", "checkin"]);
      const d = await result(
        db.rpc("pageant_redeem_ticket", { p_hash: hash, p_actor: uid }),
      );
      await audit(uid, "ticket_redeemed", t.order.project_id, t.id);
      return json(200, { ok: true, result: d });
    }
    if (action === "finance" && req.method === "GET") {
      const project = id(u.searchParams.get("project"));
      permit(project, ["owner", "manager", "finance"]);
      const [orders, entries, refunds, settlements, fees, invoices] =
        await Promise.all([
          result(
            db
              .from("pageant_commerce_orders")
              .select("*")
              .eq("project_id", project)
              .order("created_at", { ascending: false }),
          ),
          result(
            db
              .from("pageant_finance_entries")
              .select("*")
              .eq("project_id", project)
              .order("created_at", { ascending: false }),
          ),
          result(
            db
              .from("pageant_refunds")
              .select(
                "*,order:pageant_commerce_orders!inner(project_id,order_no)",
              )
              .eq("order.project_id", project),
          ),
          result(
            db
              .from("pageant_settlements")
              .select("*")
              .eq("project_id", project),
          ),
          result(
            db
              .from("pageant_fee_rules")
              .select("*")
              .or("project_id.is.null,project_id.eq." + project),
          ),
          result(
            db
              .from("pageant_invoice_records")
              .select("*,order:pageant_commerce_orders!inner(project_id)")
              .eq("order.project_id", project),
          ),
        ]);
      return json(200, {
        ok: true,
        orders,
        entries,
        refunds,
        settlements,
        fees,
        invoices,
        balance: entries.reduce((n: number, e: any) => n + e.amount, 0),
      });
    }
    if (action === "add-expense" && req.method === "POST") {
      const project = id(body.project_id);
      permit(project, ["owner", "manager", "finance"]);
      const kind = body.kind === "gateway_fee" ? "gateway_fee" : "expense";
      if (body.proof_asset_id) {
        const proof = await result(
          db
            .from("pageant_assets")
            .select("id")
            .eq("id", id(body.proof_asset_id))
            .eq("project_id", project)
            .maybeSingle(),
        );
        if (!proof) fail("憑證須屬於同一專案");
      }
      const entry = await result(
        db
          .from("pageant_finance_entries")
          .insert({
            project_id: project,
            kind,
            amount: -integer(body.amount, 1),
            description: str(body.description, 2000),
            proof_asset_id: body.proof_asset_id || null,
            created_by: uid,
          })
          .select()
          .single(),
      );
      await audit(uid, "expense_recorded", project, entry.id);
      return json(200, { ok: true, entry });
    }
    if (action === "request-settlement" && req.method === "POST") {
      const project = id(body.project_id);
      permit(project, ["owner", "manager", "finance"]);
      const p = await result(
        db.from("pageant_projects").select("status").eq("id", project).single(),
      );
      if (!["closed", "archived"].includes(p.status)) fail("請先完成活動結案");
      const cfg = await commerceReady();
      if (!cfg.payouts_enabled) fail("平台尚未開放撥款結算");
      const pending = await result(
        db
          .from("pageant_refunds")
          .select("id,order:pageant_commerce_orders!inner(project_id)")
          .eq("order.project_id", project)
          .in("status", ["requested", "approved", "processing"]),
      );
      if (pending.length) fail("請先完成退款處理");
      const existing = await result(
        db
          .from("pageant_settlements")
          .select("id")
          .eq("project_id", project)
          .in("status", ["requested", "review", "approved"]),
      );
      if (existing.length) fail("此專案已有結算申請", 409);
      const entries = await result(
        db
          .from("pageant_finance_entries")
          .select("*")
          .eq("project_id", project),
      );
      const balance = entries.reduce((n: number, e: any) => n + e.amount, 0);
      if (balance <= 0) fail("目前沒有可結算餘額");
      const settlement = await result(
        db
          .from("pageant_settlements")
          .insert({
            project_id: project,
            amount: balance,
            snapshot: { entries, generated_at: new Date().toISOString() },
            created_by: uid,
          })
          .select()
          .single(),
      );
      await audit(uid, "settlement_requested", project, settlement.id);
      return json(200, { ok: true, settlement });
    }
    if (action === "review-settlement" && req.method === "POST") {
      financialAdmin();
      if (!["review", "approved", "rejected"].includes(body.status))
        fail("結算狀態錯誤");
      await result(
        db
          .from("pageant_settlements")
          .update({ status: body.status, updated_at: new Date().toISOString() })
          .eq("id", id(body.id))
          .neq("status", "paid"),
      );
      return json(200, { ok: true });
    }
    if (action === "confirm-payout" && req.method === "POST") {
      financialAdmin();
      if (!(await commerceReady()).payouts_enabled)
        fail("平台尚未開放撥款結算");
      const settlement = await result(
        db
          .from("pageant_settlements")
          .select("project_id")
          .eq("id", id(body.id))
          .single(),
      );
      const proof = await result(
        db
          .from("pageant_assets")
          .select("id")
          .eq("id", id(body.proof_asset_id))
          .eq("project_id", settlement.project_id)
          .maybeSingle(),
      );
      if (!proof) fail("請選擇此專案的實際銀行撥款憑證");
      const d = await result(
        db.rpc("pageant_confirm_payout", {
          p_id: id(body.id),
          p_actor: uid,
          p_reference: str(body.reference, 200),
        }),
      );
      await result(
        db
          .from("pageant_finance_entries")
          .update({ proof_asset_id: proof.id })
          .eq("source_key", "payout:" + body.id),
      );
      await audit(uid, "payout_recorded", null, body.id);
      return json(200, { ok: true, result: d });
    }
    if (action === "admin" && req.method === "GET") {
      admin();
      const [
        projects,
        brands,
        organizations,
        fees,
        settings,
        staffrows,
        channels,
      ] = await Promise.all([
        result(db.from("pageant_projects").select("*").order("sort_order")),
        result(db.from("pageant_brands").select("*")),
        result(db.from("pageant_organizations").select("*")),
        result(db.from("pageant_fee_rules").select("*")),
        result(db.from("pageant_settings").select("*")),
        result(db.from("pageant_staff").select("*")),
        result(
          db
            .from("pageant_channel_jobs")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(100),
        ),
      ]);
      return json(200, {
        ok: true,
        projects,
        brands,
        organizations,
        fees,
        settings,
        staff: staffrows,
        channels,
        readiness: {
          ai: !!Deno.env.get("OPENAI_API_KEY"),
          video:
            !!Deno.env.get("CLOUDFLARE_STREAM_API_TOKEN") &&
            !!Deno.env.get("CLOUDFLARE_ACCOUNT_ID"),
          payment:
            Deno.env.get("ECPAY_MODE") === "production" &&
            !!Deno.env.get("ECPAY_MERCHANT_ID") &&
            !!Deno.env.get("ECPAY_HASH_KEY") &&
            !!Deno.env.get("ECPAY_HASH_IV"),
          facebook:
            !!Deno.env.get("PAGEANT_FACEBOOK_PAGE_TOKEN") &&
            !!Deno.env.get("PAGEANT_FACEBOOK_PAGE_ID"),
          line: !!Deno.env.get("PAGEANT_LINE_CHANNEL_TOKEN"),
          invoice: !!Deno.env.get("PAGEANT_INVOICE_ENDPOINT"),
        },
      });
    }
    if (action === "save-fee" && req.method === "POST") {
      admin();
      if (!["ticket", "course", "sponsor"].includes(body.kind))
        fail("費率類型錯誤");
      const project = body.project_id ? id(body.project_id) : null;
      const data = {
        project_id: project,
        kind: body.kind,
        rate_bps:
          body.rate_bps === null ? null : integer(body.rate_bps, 0, 10000),
        gateway_fee_bearer: ["platform", "organizer"].includes(
          body.gateway_fee_bearer,
        )
          ? body.gateway_fee_bearer
          : null,
        terms: str(body.terms || "", 5000),
        enabled: body.enabled === true,
        updated_at: new Date().toISOString(),
      };
      if (
        data.enabled &&
        (data.rate_bps === null || !data.gateway_fee_bearer || !data.terms)
      )
        fail("請先填妥費率與條款");
      let q = db.from("pageant_fee_rules").select("id").eq("kind", body.kind);
      q = project ? q.eq("project_id", project) : q.is("project_id", null);
      const existing = await result(q.maybeSingle());
      const fee = existing
        ? await result(
            db
              .from("pageant_fee_rules")
              .update(data)
              .eq("id", existing.id)
              .select()
              .single(),
          )
        : await result(
            db.from("pageant_fee_rules").insert(data).select().single(),
          );
      await audit(uid, "fee_rule_saved", project, fee.id);
      return json(200, { ok: true, fee });
    }
    if (action === "save-commerce-settings" && req.method === "POST") {
      admin();
      if (body.enabled && body.merchant_reviewed !== true)
        fail("請先確認商店合約與代收結算資格");
      if (
        body.enabled &&
        (!Deno.env.get("ECPAY_HASH_KEY") ||
          Deno.env.get("ECPAY_MODE") !== "production")
      )
        fail("正式金流未設定完成");
      const data = {
        enabled: body.enabled === true,
        merchant_reviewed: body.merchant_reviewed === true,
        payouts_enabled: body.payouts_enabled === true,
      };
      await result(
        db
          .from("pageant_settings")
          .update({ value: data, updated_at: new Date().toISOString() })
          .eq("key", "commerce"),
      );
      await audit(uid, "commerce_settings_saved", null, null, data);
      return json(200, { ok: true });
    }
    if (action === "save-brand" && req.method === "POST") {
      admin();
      const slug = str(body.slug, 80),
        domain = str(body.domain, 150);
      if (
        !/^[a-z0-9][a-z0-9-]{1,79}$/.test(slug) ||
        !/^([a-z0-9][a-z0-9-]{1,62})\.self\.com\.tw$/.test(domain) ||
        ["pageant.self.com.tw", "she.self.com.tw", "www.self.com.tw"].includes(
          domain,
        )
      )
        fail("官網網址或品牌代稱錯誤");
      const previous = body.id
        ? await result(
            db
              .from("pageant_brands")
              .select("*")
              .eq("id", id(body.id))
              .single(),
          )
        : null;
      if (body.logo_url && !safeUrl(body.logo_url, { image: true }))
        fail("品牌Logo網址錯誤");
      const data = {
        slug,
        name: str(body.name),
        domain,
        status: previous?.domain === domain ? previous.status : "draft",
        domain_status:
          previous?.domain === domain ? previous.domain_status : "pending",
        theme: {
          wordmark: str(body.wordmark || "", 100),
          accent: /^#[a-fA-F0-9]{6}$/.test(body.accent)
            ? body.accent
            : "#aa8856",
          logo_url: body.logo_url || "",
        },
      };
      const brand = body.id
        ? await result(
            db
              .from("pageant_brands")
              .update(data)
              .eq("id", id(body.id))
              .select()
              .single(),
          )
        : await result(
            db.from("pageant_brands").insert(data).select().single(),
          );
      if (body.project_id) {
        const p = await result(
          db
            .from("pageant_projects")
            .select("review_status")
            .eq("id", id(body.project_id))
            .single(),
        );
        if (p.review_status !== "approved") fail("請先審核活動專案");
        await result(
          db
            .from("pageant_projects")
            .update({ brand_id: brand.id, domain: "https://" + domain })
            .eq("id", body.project_id),
        );
        await result(
          db
            .from("pageant_brands")
            .update({ primary_project_id: body.project_id })
            .eq("id", brand.id),
        );
      }
      await audit(uid, "brand_saved", null, brand.id);
      return json(200, { ok: true, brand });
    }
    if (action === "activate-brand" && req.method === "POST") {
      admin();
      const b = await result(
        db
          .from("pageant_brands")
          .select("domain")
          .eq("id", id(body.id))
          .single(),
      );
      let probe: any;
      try {
        const r = await fetch("https://" + b.domain + "/api/site-status", {
          signal: AbortSignal.timeout(12000),
          redirect: "error",
        });
        probe = await r.json();
        if (!r.ok) throw Error();
      } catch {
        fail("官網尚未通過HTTPS連線驗證，請先完成DNS、網域綁定與憑證", 409);
      }
      if (probe.platform !== "SELF-PAGEANT-v3" || probe.host !== b.domain)
        fail("網域尚未連接此平台", 409);
      const p = await result(
        db
          .from("pageant_projects")
          .select("brand_id,review_status")
          .eq("id", id(body.primary_project_id))
          .single(),
      );
      if (p.brand_id !== body.id || p.review_status !== "approved")
        fail("主要專案須屬於此品牌且已通過審核");
      await result(
        db
          .from("pageant_brands")
          .update({
            status: "approved",
            domain_status: "verified",
            primary_project_id: body.primary_project_id,
          })
          .eq("id", id(body.id)),
      );
      await audit(uid, "brand_activated", body.primary_project_id, body.id);
      return json(200, { ok: true });
    }
    if (action === "ai-plan" && req.method === "POST") {
      const key = Deno.env.get("OPENAI_API_KEY");
      if (!key)
        fail(
          "SELF安全後台尚未配置可用的OpenAI金鑰，您仍可使用活動表單建立草稿",
          503,
        );
      const recent = await result(
        db
          .from("pageant_ai_runs")
          .select("id")
          .eq("user_id", uid)
          .gte("created_at", new Date(Date.now() - 86400000).toISOString()),
      );
      if (recent.length >= 5) fail("今日AI企劃額度已用完", 429);
      const input = {
        title: str(body.title),
        kind: str(body.kind, 80),
        goal: str(body.goal || "", 2000),
        location: str(body.location || "", 200),
        budget: integer(body.budget || 0),
        scale: integer(body.scale || 0),
        date: body.date || null,
      };
      const run = await result(
        db
          .from("pageant_ai_runs")
          .insert({ user_id: uid, input })
          .select()
          .single(),
      );
      const schema = {
        type: "object",
        additionalProperties: false,
        properties: {
          summary: { type: "string" },
          sections: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                heading: { type: "string" },
                paragraphs: { type: "array", items: { type: "string" } },
              },
              required: ["heading", "paragraphs"],
            },
          },
          tasks: { type: "array", items: { type: "string" } },
          sponsor_packages: { type: "array", items: { type: "string" } },
          unconfirmed: { type: "array", items: { type: "string" } },
        },
        required: [
          "summary",
          "sections",
          "tasks",
          "sponsor_packages",
          "unconfirmed",
        ],
      };
      try {
        const response = await fetch("https://api.openai.com/v1/responses", {
          method: "POST",
          headers: {
            Authorization: "Bearer " + key,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: Deno.env.get("PAGEANT_OPENAI_MODEL") || "gpt-5-mini",
            instructions:
              "你是台灣繁體中文選美活動企劃助理。只產生可編輯草稿。不得虛構場地已預訂、品牌已贊助、嘉賓已同意或人物引述。預算為規劃估算，列出所有待確認事項。不可自行發布或建立訂單。",
            input: JSON.stringify(input),
            max_output_tokens: 5000,
            text: {
              format: {
                type: "json_schema",
                name: "pageant_event_plan",
                strict: true,
                schema,
              },
            },
          }),
          signal: AbortSignal.timeout(90000),
        });
        const d = await response.json();
        if (!response.ok) throw Error("provider_unavailable");
        const text = d.output
          ?.flatMap((o: any) => o.content || [])
          .find((c: any) => c.type === "output_text")?.text;
        if (!text) throw Error("empty_result");
        const output = JSON.parse(text);
        await result(
          db
            .from("pageant_ai_runs")
            .update({ status: "completed", output })
            .eq("id", run.id),
        );
        return json(200, { ok: true, run_id: run.id, plan: output });
      } catch {
        await result(
          db
            .from("pageant_ai_runs")
            .update({ status: "failed", error_code: "provider_unavailable" })
            .eq("id", run.id),
        );
        fail("AI暫時無法產生企劃，請稍後重試或使用手動建案", 503);
      }
    }
    if (action === "ai-runs" && req.method === "GET")
      return json(200, {
        ok: true,
        runs: await result(
          db
            .from("pageant_ai_runs")
            .select("id,status,input,output,created_at")
            .eq("user_id", uid)
            .order("created_at", { ascending: false })
            .limit(30),
        ),
      });
    if (action === "channel-publish" && req.method === "POST") {
      const a = await result(
        db
          .from("pageant_articles")
          .select("*")
          .eq("id", id(body.article_id))
          .single(),
      );
      permit(a.project_id, reviewer);
      if (!["facebook", "line"].includes(body.channel)) fail("發布渠道錯誤");
      const pub =
        a.status === "scheduled" && a.scheduled_publication
          ? { content: a.scheduled_publication, publish_at: a.scheduled_at }
          : effectivePublication(a);
      if (!pub.content || !pub.publish_at)
        fail("請先將新聞發布到官網或核准排程");
      const project = a.project_id
        ? await result(
            db
              .from("pageant_projects")
              .select("domain,review_status,public")
              .eq("id", a.project_id)
              .single(),
          )
        : null;
      if (project && (!project.public || project.review_status !== "approved"))
        fail("專案尚未核准公開");
      const link =
        (project?.domain &&
        /^https:\/\/[a-z0-9-]+\.self\.com\.tw$/.test(project.domain)
          ? project.domain
          : "https://pageant.self.com.tw") +
        "/news/" +
        a.slug;
      const globalReviewer = owner || staff?.role === "reviewer";
      const old = await result(
        db
          .from("pageant_channel_jobs")
          .select("*")
          .eq("article_id", a.id)
          .eq("channel", body.channel)
          .maybeSingle(),
      );
      if (
        old &&
        ["sent", "processing", "unknown", "pending"].includes(old.status)
      )
        return json(200, { ok: true, status: old.status, url: old.public_url });
      const data = {
        article_id: a.id,
        channel: body.channel,
        status: globalReviewer ? "pending" : "review",
        scheduled_at: new Date(
          Math.max(Date.now(), Date.parse(pub.publish_at)),
        ).toISOString(),
        content_hash: await sha(JSON.stringify(pub.content)),
        payload: {
          message: pub.content.title + "\n\n" + (pub.content.subtitle || ""),
          link,
        },
        approved_by: globalReviewer ? uid : null,
        error_code: null,
        updated_at: new Date().toISOString(),
      };
      const job = old
        ? await result(
            db
              .from("pageant_channel_jobs")
              .update(data)
              .eq("id", old.id)
              .in("status", ["review", "failed", "cancelled"])
              .select()
              .maybeSingle(),
          )
        : await result(
            db.from("pageant_channel_jobs").insert(data).select().single(),
          );
      if (!job) fail("渠道工作已由其他人處理", 409);
      await audit(uid, "channel_queued", a.project_id, a.id, {
        channel: body.channel,
        status: job.status,
      });
      return json(200, {
        ok: true,
        status: job.status,
        message: globalReviewer
          ? "已加入發布佇列，將在排程時間後約5分鐘內處理。"
          : "已送平台審核，不會直接推播。",
      });
    }
    if (action === "review-channel" && req.method === "POST") {
      if (!owner && staff?.role !== "reviewer") fail("需要平台審核權限", 403);
      if (!["approved", "rejected"].includes(body.status)) fail("審核狀態錯誤");
      const job = await result(
        db
          .from("pageant_channel_jobs")
          .update({
            status: body.status === "approved" ? "pending" : "cancelled",
            approved_by: uid,
            updated_at: new Date().toISOString(),
          })
          .eq("id", id(body.id))
          .eq("status", "review")
          .select()
          .maybeSingle(),
      );
      if (!job) fail("此發布工作已處理", 409);
      await audit(uid, "channel_reviewed", null, job.id, {
        status: job.status,
      });
      return json(200, { ok: true });
    }
    if (action === "asset-upload" && req.method === "POST") {
      const project = id(body.project_id);
      permit(project, ["owner", "manager", "editor", "finance"]);
      const ext = (
        {
          "image/jpeg": "jpg",
          "image/png": "png",
          "image/webp": "webp",
        } as Record<string, string>
      )[body.mime];
      if (!ext) fail("僅支援JPG、PNG或WebP");
      integer(body.bytes, 1, 12582912);
      const path = project + "/" + crypto.randomUUID() + "." + ext;
      const r = await db.storage
        .from("pageant-editorial")
        .createSignedUploadUrl(path);
      if (r.error) fail("無法建立上傳連結", 503);
      const asset = await result(
        db
          .from("pageant_assets")
          .insert({
            project_id: project,
            object_path: path,
            filename: str(body.filename),
            mime: body.mime,
            bytes: body.bytes,
            caption: str(body.caption || "", 1500),
            source: str(body.source || "", 2000),
            created_by: uid,
          })
          .select()
          .single(),
      );
      return json(200, {
        ok: true,
        asset,
        url: r.data.signedUrl,
        public_url: "/api/news?action=image&path=" + encodeURIComponent(path),
      });
    }
    if (action === "asset-preview" && req.method === "POST") {
      let q = db.from("pageant_assets").select("*");
      q = body.path
        ? q.eq("object_path", str(body.path, 200))
        : q.eq("id", id(body.id));
      const a = await result(q.single());
      permit(a.project_id, [
        "owner",
        "manager",
        "editor",
        "reviewer",
        "viewer",
        "finance",
      ]);
      const r = await db.storage
        .from("pageant-editorial")
        .createSignedUrl(a.object_path, 300);
      if (r.error) fail("圖片尚未上傳完成", 404);
      return json(200, { ok: true, url: r.data.signedUrl });
    }
    if (action === "asset-delete" && req.method === "POST") {
      const a = await result(
        db.from("pageant_assets").select("*").eq("id", id(body.id)).single(),
      );
      const r = permit(a.project_id, ["owner", "manager", "editor", "finance"]);
      if (r === "finance" && a.created_by !== uid)
        fail("只能刪除自己上傳的未引用憑證", 403);
      const target =
        "/api/news?action=image&path=" + encodeURIComponent(a.object_path);
      const [news, books, finance, invoice, films, people] = await Promise.all([
        result(
          db
            .from("pageant_article_versions")
            .select("id")
            .contains("snapshot", { content: { photos: [{ url: target }] } })
            .limit(1),
        ),
        result(
          db
            .from("pageant_document_versions")
            .select("id")
            .contains("snapshot", { chapters: [{ photo: target }] })
            .limit(1),
        ),
        result(
          db
            .from("pageant_finance_entries")
            .select("id")
            .eq("proof_asset_id", a.id)
            .limit(1),
        ),
        result(
          db
            .from("pageant_invoice_records")
            .select("id")
            .eq("proof_asset_id", a.id)
            .limit(1),
        ),
        result(
          db
            .from("pageant_media")
            .select("id,poster,publication")
            .eq("project_id", a.project_id)
            .or("poster.eq." + target + ",publication->>poster.eq." + target),
        ),
        result(db.from("pageant_contestants").select("id").eq("photo", target)),
      ]);
      if (
        news.length ||
        books.length ||
        finance.length ||
        invoice.length ||
        films.length ||
        people.length
      )
        fail("此素材已被內容版本或帳務引用，請保留原始檔");
      const removed = await db.storage
        .from("pageant-editorial")
        .remove([a.object_path]);
      if (removed.error) fail("無法移除素材", 503);
      await result(db.from("pageant_assets").delete().eq("id", a.id));
      await audit(uid, "asset_deleted", a.project_id, a.id);
      return json(200, { ok: true });
    }
    if (action === "team" && req.method === "GET") {
      const project = id(u.searchParams.get("project"));
      permit(project, ["owner", "manager"]);
      const members = await result(
        db
          .from("pageant_project_members")
          .select("*")
          .eq("project_id", project),
      );
      const profiles = members.length
        ? await result(
            db
              .from("pageant_member_profiles")
              .select("user_id,display_name")
              .in(
                "user_id",
                members.map((m: any) => m.user_id),
              ),
          )
        : [];
      const invites = await result(
        db
          .from("pageant_invites")
          .select("id,role,accepted_by,expires_at,revoked_at,created_at")
          .eq("project_id", project)
          .order("created_at", { ascending: false }),
      );
      return json(200, {
        ok: true,
        members: members.map((m: any) => ({
          ...m,
          name:
            profiles.find((p: any) => p.user_id === m.user_id)?.display_name ||
            "專案成員",
        })),
        invites,
      });
    }
    if (action === "create-invite" && req.method === "POST") {
      const project = id(body.project_id);
      permit(project, ["owner", "manager"]);
      if (
        ![
          "manager",
          "editor",
          "reviewer",
          "viewer",
          "judge",
          "finance",
          "checkin",
        ].includes(body.role)
      )
        fail("成員角色錯誤");
      const raw = crypto.randomUUID() + crypto.randomUUID();
      const invite = await result(
        db
          .from("pageant_invites")
          .insert({
            project_id: project,
            role: body.role,
            token_hash: await sha(raw),
            created_by: uid,
          })
          .select("id,expires_at")
          .single(),
      );
      await audit(uid, "invite_created", project, invite.id, {
        role: body.role,
      });
      return json(200, {
        ok: true,
        url: "https://pageant.self.com.tw/invite?code=" + raw,
        expires_at: invite.expires_at,
      });
    }
    if (action === "revoke-invite" && req.method === "POST") {
      const i = await result(
        db
          .from("pageant_invites")
          .select("project_id")
          .eq("id", id(body.id))
          .single(),
      );
      permit(i.project_id, ["owner", "manager"]);
      await result(
        db
          .from("pageant_invites")
          .update({ revoked_at: new Date().toISOString() })
          .eq("id", body.id),
      );
      await audit(uid, "invite_revoked", i.project_id, body.id);
      return json(200, { ok: true });
    }
    if (action === "accept-invite" && req.method === "POST") {
      const project = await result(
        db.rpc("pageant_accept_invite", {
          p_hash: await sha(str(body.code, 200)),
          p_actor: uid,
        }),
      );
      await audit(uid, "invite_accepted", project, null);
      return json(200, { ok: true, project_id: project });
    }
    if (action === "remove-member" && req.method === "POST") {
      const project = id(body.project_id);
      permit(project, ["owner", "manager"]);
      const member = id(body.user_id);
      if (member === uid) fail("不能在此移除自己的管理權限");
      const existing = await result(
        db
          .from("pageant_project_members")
          .select("role")
          .eq("project_id", project)
          .eq("user_id", member)
          .maybeSingle(),
      );
      if (existing?.role === "manager" && !owner)
        fail("移除專案經理需要平台管理員確認", 403);
      await result(
        db
          .from("pageant_project_members")
          .delete()
          .eq("project_id", project)
          .eq("user_id", member),
      );
      await audit(uid, "member_removed", project, member);
      return json(200, { ok: true });
    }
    if (action === "people" && req.method === "GET") {
      const project = id(u.searchParams.get("project"));
      const r = permit(project, [
        "owner",
        "manager",
        "editor",
        "reviewer",
        "viewer",
        "judge",
        "checkin",
      ]);
      if (r === "checkin") {
        const rows = await result(
          db
            .from("pageant_registrations")
            .select(
              "id,status,profile,activity:pageant_activities!inner(project_id,title)",
            )
            .eq("activity.project_id", project)
            .in("status", ["approved", "attended"]),
        );
        return json(200, {
          ok: true,
          registrations: rows.map((x: any) => ({
            ...x,
            profile: { name: x.profile.name, country: x.profile.country },
          })),
          contestants: [],
          scores: [],
          assignments: [],
          results: [],
        });
      }
      const [contestants, scores, assignments, results] = await Promise.all([
        result(
          db.from("pageant_contestants").select("*").eq("project_id", project),
        ),
        result(
          db
            .from("pageant_scores")
            .select("*,activity:pageant_activities!inner(project_id,title)")
            .eq("activity.project_id", project),
        ),
        result(
          db
            .from("pageant_judge_assignments")
            .select("*,activity:pageant_activities!inner(project_id,title)")
            .eq("activity.project_id", project),
        ),
        result(
          db.from("pageant_results").select("*").eq("project_id", project),
        ),
      ]);
      return json(200, {
        ok: true,
        contestants:
          r === "judge"
            ? contestants
                .filter((c: any) => c.status === "approved")
                .map((c: any) => ({
                  id: c.id,
                  project_id: c.project_id,
                  name: c.name,
                  country: c.country,
                  photo: c.photo,
                  status: c.status,
                }))
            : contestants,
        scores: !["owner", "manager"].includes(r)
          ? scores.filter((x: any) => x.judge_id === uid)
          : scores,
        assignments:
          r === "judge"
            ? assignments.filter((x: any) => x.user_id === uid)
            : assignments,
        results,
      });
    }
    if (action === "save-contestant" && req.method === "POST") {
      const project = id(body.project_id);
      const r = permit(project, editor);
      if (!["draft", "approved", "rejected"].includes(body.status))
        fail("佳麗資料狀態錯誤");
      if (body.status === "approved" && r === "editor")
        fail("核准佳麗介紹需主辦確認", 403);
      const photo = body.photo ? await normalizeImage(body.photo, project) : "";
      let user = null,
        source = null;
      if (body.source_registration) {
        const reg = await result(
          db
            .from("pageant_registrations")
            .select("user_id,activity:pageant_activities!inner(project_id)")
            .eq("id", id(body.source_registration))
            .single(),
        );
        if (reg.activity.project_id !== project) fail("報名紀錄須屬於同一專案");
        user = reg.user_id;
        source = body.source_registration;
      }
      const data = {
        project_id: project,
        name: str(body.name, 160),
        country: str(body.country || "", 100),
        bio: str(body.bio || "", 5000),
        photo,
        status: body.status,
        public_consent: body.public_consent === true,
        ...(source ? { source_registration: source, user_id: user } : {}),
      };
      if (!data.name) fail("請填姓名");
      const contestant = body.id
        ? await result(
            db
              .from("pageant_contestants")
              .update({
                ...data,
                version: integer(body.version, 1) + 1,
                updated_at: new Date().toISOString(),
              })
              .eq("id", id(body.id))
              .eq("project_id", project)
              .eq("version", body.version)
              .select()
              .maybeSingle(),
          )
        : await result(
            db
              .from("pageant_contestants")
              .insert({ ...data, created_by: uid })
              .select()
              .single(),
          );
      if (!contestant) fail("佳麗資料已被更新", 409);
      await audit(uid, "contestant_saved", project, contestant.id, {
        name: contestant.name,
      });
      return json(200, { ok: true, contestant });
    }
    if (action === "assign-judge" && req.method === "POST") {
      const a = await result(
        db
          .from("pageant_activities")
          .select("project_id,kind")
          .eq("id", id(body.activity_id))
          .single(),
      );
      permit(a.project_id, ["owner", "manager"]);
      if (!["segment", "final", "pageant"].includes(a.kind))
        fail("請選擇比賽活動");
      const judge = id(body.user_id);
      const member = await result(
        db
          .from("pageant_project_members")
          .select("role")
          .eq("project_id", a.project_id)
          .eq("user_id", judge)
          .maybeSingle(),
      );
      if (!member && !(owner && judge === uid)) fail("請先邀請評審加入此專案");
      await result(
        db
          .from("pageant_judge_assignments")
          .upsert({ activity_id: body.activity_id, user_id: judge }),
      );
      await audit(uid, "judge_assigned", a.project_id, body.activity_id);
      return json(200, { ok: true });
    }
    if (action === "save-score" && req.method === "POST") {
      const a = await result(
        db
          .from("pageant_activities")
          .select("project_id")
          .eq("id", id(body.activity_id))
          .single(),
      );
      permit(a.project_id, [
        "owner",
        "manager",
        "editor",
        "reviewer",
        "viewer",
        "judge",
        "finance",
      ]);
      const assignment = await result(
        db
          .from("pageant_judge_assignments")
          .select("user_id")
          .eq("activity_id", body.activity_id)
          .eq("user_id", uid)
          .maybeSingle(),
      );
      if (!assignment) fail("您尚未被指派為此場評審", 403);
      const published = await result(
        db
          .from("pageant_results")
          .select("activity_id")
          .eq("activity_id", body.activity_id)
          .maybeSingle(),
      );
      if (published) fail("成績已確認發布，不可覆寫評分");
      const c = await result(
        db
          .from("pageant_contestants")
          .select("project_id,status")
          .eq("id", id(body.contestant_id))
          .single(),
      );
      if (c.project_id !== a.project_id || c.status !== "approved")
        fail("請選擇已確認的參賽者");
      const values = ["poise", "expression", "stage", "impression"].map((k) =>
        integer(body.scores?.[k], 0, 100),
      );
      const scores = {
        poise: values[0],
        expression: values[1],
        stage: values[2],
        impression: values[3],
      };
      const existing = await result(
        db
          .from("pageant_scores")
          .select("*")
          .eq("activity_id", body.activity_id)
          .eq("contestant_id", body.contestant_id)
          .eq("judge_id", uid)
          .maybeSingle(),
      );
      if (existing?.submitted) fail("評分已正式送出，不可自行修改");
      const data = {
        activity_id: body.activity_id,
        contestant_id: body.contestant_id,
        judge_id: uid,
        scores,
        total: values.reduce((a, b) => a + b, 0) / 4,
        note: str(body.note || "", 2000),
        submitted: body.submitted === true,
        updated_at: new Date().toISOString(),
      };
      const score = existing
        ? await result(
            db
              .from("pageant_scores")
              .update({ ...data, version: existing.version + 1 })
              .eq("id", existing.id)
              .eq("version", body.version)
              .select()
              .maybeSingle(),
          )
        : await result(
            db.from("pageant_scores").insert(data).select().single(),
          );
      if (!score) fail("評分已被更新", 409);
      await audit(uid, "score_saved", a.project_id, score.id, {
        submitted: score.submitted,
      });
      return json(200, { ok: true, score });
    }
    if (action === "publish-results" && req.method === "POST") {
      const a = await result(
        db
          .from("pageant_activities")
          .select("project_id,title")
          .eq("id", id(body.activity_id))
          .single(),
      );
      permit(a.project_id, ["owner", "manager"]);
      if (body.results_confirmed !== true) fail("請先確認成績與公開名單");
      const [judges, contestants, scores] = await Promise.all([
        result(
          db
            .from("pageant_judge_assignments")
            .select("user_id")
            .eq("activity_id", body.activity_id),
        ),
        result(
          db
            .from("pageant_contestants")
            .select("id,name,country,public_consent")
            .eq("project_id", a.project_id)
            .eq("status", "approved"),
        ),
        result(
          db
            .from("pageant_scores")
            .select("*")
            .eq("activity_id", body.activity_id)
            .eq("submitted", true),
        ),
      ]);
      if (!judges.length || !contestants.length) fail("尚無完整評審與參賽名單");
      const rows = contestants
        .map((c: any) => {
          const s = scores.filter(
            (s: any) =>
              s.contestant_id === c.id &&
              judges.some((j: any) => j.user_id === s.judge_id),
          );
          if (s.length !== judges.length) fail("尚有評審未送出完整評分");
          if (!c.public_consent) fail("公開成績前須確認參賽者公開同意");
          return {
            contestant_id: c.id,
            name: c.name,
            country: c.country,
            total: Number(
              (
                s.reduce((n: number, x: any) => n + Number(x.total), 0) /
                judges.length
              ).toFixed(2),
            ),
          };
        })
        .sort((x: any, y: any) => y.total - x.total);
      rows.forEach(
        (r: any, i: number) =>
          (r.rank =
            i && r.total === rows[i - 1].total ? rows[i - 1].rank : i + 1),
      );
      await result(
        db
          .from("pageant_results")
          .upsert({
            activity_id: body.activity_id,
            project_id: a.project_id,
            snapshot: {
              title: a.title,
              judges_count: judges.length,
              criteria: ["儀態", "表達", "舞台表現", "綜合印象"],
              results: rows,
            },
            published_by: uid,
            published_at: new Date().toISOString(),
          }),
      );
      await audit(uid, "results_published", a.project_id, body.activity_id);
      return json(200, { ok: true, results: rows });
    }
    if (action === "build-report" && req.method === "POST") {
      const project = id(body.project_id);
      permit(project, ["owner", "manager", "editor"]);
      const p = await result(
        db
          .from("pageant_projects")
          .select("title,slug,domain")
          .eq("id", project)
          .single(),
      );
      const articles = (await publishedArticles()).filter(
        (a: any) => a.project_id === project,
      );
      const items = await result(
        db
          .from("pageant_work_items")
          .select("title,kind,status,payload")
          .eq("project_id", project)
          .in("kind", ["sponsor", "media", "closeout"]),
      );
      const text = [
        p.title + "｜媒體與交付成果",
        "公開新聞：" + articles.length + " 篇",
        ...articles.map(
          (a: any) =>
            a.content.title +
            "\n" +
            (p.domain || "https://pageant.self.com.tw") +
            "/news/" +
            a.slug,
        ),
        "合作與交付紀錄",
        ...items.map(
          (i: any) =>
            i.title +
            "｜" +
            i.status +
            "\n" +
            (i.payload.deliverables || i.payload.note || ""),
        ),
        "各項數據以可查證紀錄為準；未取得外部渠道數據時不估算曝光。",
      ].join("\n\n");
      const proposal = await result(
        db
          .from("pageant_proposals")
          .insert({
            project_id: project,
            title: p.title + "｜媒體結案報告",
            kind: "report",
            status: "draft",
            content: {
              body: text,
              article_ids: articles.map((a: any) => a.id),
              generated_at: new Date().toISOString(),
            },
            created_by: uid,
            updated_by: uid,
          })
          .select()
          .single(),
      );
      await audit(uid, "report_generated", project, proposal.id);
      return json(200, { ok: true, proposal });
    }
    if (action === "document" && req.method === "GET") {
      const kind = u.searchParams.get("kind");
      if (!["proposal", "publication"].includes(kind || ""))
        fail("文件類型錯誤");
      const table =
        kind === "proposal" ? "pageant_proposals" : "pageant_publications";
      const document = await result(
        db
          .from(table)
          .select("*")
          .eq("id", id(u.searchParams.get("id")))
          .single(),
      );
      permit(document.project_id);
      const versions = await result(
        db
          .from("pageant_document_versions")
          .select("id,version,created_at")
          .eq("entity_kind", table)
          .eq("entity_id", document.id)
          .order("version", { ascending: false })
          .limit(60),
      );
      return json(200, { ok: true, document, versions });
    }
    if (action === "restore-document" && req.method === "POST") {
      if (!["proposal", "publication"].includes(body.kind))
        fail("文件類型錯誤");
      const table =
        body.kind === "proposal" ? "pageant_proposals" : "pageant_publications";
      const d = await result(
        db.from(table).select("*").eq("id", id(body.id)).single(),
      );
      permit(d.project_id, editor);
      const v = await result(
        db
          .from("pageant_document_versions")
          .select("snapshot")
          .eq("entity_kind", table)
          .eq("entity_id", d.id)
          .eq("version", integer(body.restore_version, 1))
          .single(),
      );
      const data =
        body.kind === "proposal"
          ? { title: v.snapshot.title, content: v.snapshot.content }
          : {
              title: v.snapshot.title,
              description: v.snapshot.description,
              chapters: v.snapshot.chapters,
            };
      const document = await result(
        db
          .from(table)
          .update({ ...data, status: "draft", updated_by: uid })
          .eq("id", d.id)
          .eq("version", body.version)
          .select()
          .maybeSingle(),
      );
      if (!document) fail("文件已被更新", 409);
      return json(200, { ok: true, document });
    }
    if (action === "save-homepage" && req.method === "POST") {
      admin();
      const articles = await publishedArticles();
      for (const key of ["hero_article_id", "feature_article_id"])
        if (body[key] && !articles.some((a: any) => a.id === body[key]))
          fail("首頁只能選擇已公開新聞");
      const value = {
        hero_article_id: body.hero_article_id || null,
        feature_article_id: body.feature_article_id || null,
      };
      await result(
        db
          .from("pageant_settings")
          .upsert({
            key: "homepage",
            value,
            updated_at: new Date().toISOString(),
          }),
      );
      await audit(uid, "homepage_updated", null, null, value);
      return json(200, { ok: true });
    }
    if (action === "invoice-record" && req.method === "POST") {
      financialAdmin();
      const o = await result(
        db
          .from("pageant_commerce_orders")
          .select("project_id,status")
          .eq("id", id(body.order_id))
          .single(),
      );
      if (!["paid", "partially_refunded", "refunded"].includes(o.status))
        fail("請先確認實際付款");
      if (
        !["issued", "void"].includes(body.status) ||
        !body.invoice_no ||
        !body.proof_asset_id
      )
        fail("請填寫實際發票號碼並附上憑證");
      const a = await result(
        db
          .from("pageant_assets")
          .select("id")
          .eq("id", id(body.proof_asset_id))
          .eq("project_id", o.project_id)
          .maybeSingle(),
      );
      if (!a) fail("發票憑證須屬於此專案");
      await result(
        db
          .from("pageant_invoice_records")
          .upsert(
            {
              order_id: body.order_id,
              status: body.status,
              invoice_no: str(body.invoice_no, 100),
              proof_asset_id: a.id,
              source: "manual",
              created_by: uid,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "order_id" },
          ),
      );
      await audit(uid, "invoice_recorded", o.project_id, body.order_id, {
        status: body.status,
      });
      return json(200, { ok: true });
    }

    fail("功能不存在", 404);
  } catch (e) {
    const status = e instanceof Failure ? e.status : 400;
    return json(status, {
      ok: false,
      error: e instanceof Error ? e.message : "服務暫時無法使用",
    });
  }
});
