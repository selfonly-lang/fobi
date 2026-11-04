"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Sparkles, Check, Plus } from "lucide-react";
import { api } from "@/lib/client-api";
import { useMember, LoadingMember, PrivateHeader } from "./session";
export function CreateEvent() {
  const { member, setMember, loading, error: loadError } = useMember(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [step, setStep] = useState(1),
    [plan, setPlan] = useState<Record<string, any> | null>(null),
    [created, setCreated] = useState<Record<string, any> | null>(null),
    [org, setOrg] = useState(""),
    [fields, setFields] = useState({
      title: "",
      kind: "選美賽事",
      year: 2027,
      goal: "",
      location: "",
      budget: 0,
      scale: 0,
      date: "",
    });
  if (loading || !member) return <LoadingMember error={loadError} />;
  const organization = org || member.organizations[0]?.id || "";
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <PrivateHeader />
      <section className="create-layout">
        <span className="eyebrow">THE EVENT STUDIO · 活動製造機</span>
        <h1>
          讓你的想法，
          <br />
          有一個完整的舞台。
        </h1>
        <p>從一份企劃開始，逐步完成活動、課程、贊助與媒體計畫。</p>
        <div className="create-steps">
          <span className={step === 1 ? "active" : ""}>01 主辦資料</span>
          <span className={step === 2 ? "active" : ""}>02 活動企劃</span>
          <span className={step === 3 ? "active" : ""}>03 建立與送審</span>
        </div>
        {error && (
          <div className="alert" role="alert">
            {error}
          </div>
        )}
        {step === 1 && (
          <>
            <section className="panel">
              <h2>選擇主辦單位</h2>
              {member.organizations.length > 0 && (
                <>
                  <label className="field">
                    我的主辦單位
                    <select
                      value={organization}
                      onChange={(e) => setOrg(e.target.value)}
                    >
                      {member.organizations.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button className="button dark" onClick={() => setStep(2)}>
                    下一步：活動企劃 <ArrowUpRight size={16} />
                  </button>
                </>
              )}
              <details open={!member.organizations.length}>
                <summary
                  className="muted"
                  style={{ cursor: "pointer", margin: "25px 0" }}
                >
                  建立新的主辦單位
                </summary>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const fd = new FormData(e.currentTarget);
                    run(async () => {
                      const d = await api(
                        "organization",
                        Object.fromEntries(fd),
                      );
                      setOrg(d.organization.id);
                      setMember(await api("me"));
                      setStep(2);
                    });
                  }}
                >
                  <div className="form-grid">
                    <label className="field wide">
                      主辦單位名稱
                      <input name="name" required maxLength={160} />
                    </label>
                    <label className="field">
                      聯絡人
                      <input
                        name="contact_name"
                        defaultValue={member.profile.display_name}
                        required
                        maxLength={120}
                      />
                    </label>
                    <label className="field">
                      Email
                      <input
                        name="email"
                        type="email"
                        defaultValue={member.user.email || ""}
                        required
                      />
                    </label>
                    <label className="field wide">
                      聯絡電話
                      <input name="phone" type="tel" required maxLength={60} />
                    </label>
                  </div>
                  <button className="button dark" disabled={busy}>
                    儲存主辦資料 <ArrowUpRight size={16} />
                  </button>
                </form>
              </details>
            </section>
            <p className="muted">
              主辦資料與活動須經平台審核後才會公開，建立草稿不代表已通過認證。
            </p>
          </>
        )}
        {step === 2 && (
          <>
            <section className="panel">
              <h2>這是一場什麼樣的活動？</h2>
              <div className="form-grid">
                <label className="field wide">
                  活動名稱
                  <input
                    value={fields.title}
                    onChange={(e) =>
                      setFields({ ...fields, title: e.target.value })
                    }
                    required
                    maxLength={200}
                  />
                </label>
                <label className="field">
                  活動類型
                  <select
                    value={fields.kind}
                    onChange={(e) =>
                      setFields({ ...fields, kind: e.target.value })
                    }
                  >
                    {["選美賽事", "課程培訓", "記者會／品牌活動"].map((k) => (
                      <option key={k}>{k}</option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  年度
                  <input
                    type="number"
                    min={2026}
                    max={2200}
                    value={fields.year}
                    onChange={(e) =>
                      setFields({ ...fields, year: Number(e.target.value) })
                    }
                  />
                </label>
                <label className="field">
                  預計日期（可先留白）
                  <input
                    type="date"
                    value={fields.date}
                    onChange={(e) =>
                      setFields({ ...fields, date: e.target.value })
                    }
                  />
                </label>
                <label className="field">
                  地區／預計場地
                  <input
                    value={fields.location}
                    onChange={(e) =>
                      setFields({ ...fields, location: e.target.value })
                    }
                    maxLength={200}
                  />
                </label>
                <label className="field">
                  規劃預算（NT$）
                  <input
                    type="number"
                    min={0}
                    value={fields.budget || ""}
                    onChange={(e) =>
                      setFields({ ...fields, budget: Number(e.target.value) })
                    }
                  />
                </label>
                <label className="field">
                  預計規模（人）
                  <input
                    type="number"
                    min={0}
                    value={fields.scale || ""}
                    onChange={(e) =>
                      setFields({ ...fields, scale: Number(e.target.value) })
                    }
                  />
                </label>
                <label className="field wide">
                  活動目標與希望協助的內容
                  <textarea
                    rows={5}
                    value={fields.goal}
                    onChange={(e) =>
                      setFields({ ...fields, goal: e.target.value })
                    }
                    maxLength={2000}
                  />
                </label>
              </div>
              <div className="form-actions">
                <button
                  className="button dark"
                  disabled={busy || !fields.title.trim()}
                  onClick={() =>
                    run(async () => {
                      const d = await api("ai-plan", fields);
                      setPlan(d.plan);
                    })
                  }
                >
                  <Sparkles size={16} />
                  {busy ? "正在製作企劃草稿…" : "AI 協助製作企劃"}
                </button>
                <button
                  className="button outline"
                  disabled={!fields.title.trim() || busy}
                  onClick={() => setStep(3)}
                >
                  使用填寫內容建案 <ArrowUpRight size={16} />
                </button>
              </div>
              <p className="muted">
                AI
                只會產生草稿，場地、品牌、嘉賓及金額仍需確認；您也可以直接使用手動表單建案。
              </p>
            </section>
            {plan && (
              <section className="panel ai-plan-preview">
                <span className="eyebrow">YOUR EDITABLE FIRST DRAFT</span>
                <h2>活動企劃草稿</h2>
                <p>{plan.summary}</p>
                {plan.sections?.map((s: Record<string, any>, i: number) => (
                  <section key={i}>
                    <h3>{s.heading}</h3>
                    {s.paragraphs?.map((p: string, j: number) => (
                      <p key={j}>{p}</p>
                    ))}
                  </section>
                ))}
                <h3>待確認事項</h3>
                <ul className="muted">
                  {plan.unconfirmed?.map((x: string, i: number) => (
                    <li key={i}>{x}</li>
                  ))}
                </ul>
                <button className="button dark" onClick={() => setStep(3)}>
                  確認草稿，下一步 <ArrowUpRight size={16} />
                </button>
              </section>
            )}
          </>
        )}
        {step === 3 && !created && (
          <section className="panel">
            <span className="eyebrow">READY FOR YOUR WORKSPACE</span>
            <h2>{fields.title}</h2>
            <p>
              {fields.kind} · {fields.year} · {fields.location || "地點待確認"}{" "}
              · {fields.date || "日期待確認"}
            </p>
            <p>
              {plan?.summary || fields.goal || "活動內容將在工作室繼續完善。"}
            </p>
            <div className="notice">
              建立後會產生專案與工作流程，所有內容先保留為私人草稿；送審並通過後才公開。
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                run(async () => {
                  const d = await api("create-project", {
                    organization_id: organization,
                    title: fields.title,
                    year: fields.year,
                    summary: plan?.summary || fields.goal,
                    venue: fields.location,
                    event_date: fields.date || null,
                  });
                  setCreated(d.project);
                  if (plan)
                    await api("save-proposal", {
                      project_id: d.project.id,
                      title: fields.title + "｜AI企劃草稿",
                      kind: "proposal",
                      status: "draft",
                      content: {
                        sections: plan.sections,
                        unconfirmed: plan.unconfirmed,
                        budget: fields.budget,
                        source: "AI草稿，需人工確認",
                      },
                    });
                });
              }}
            >
              <label className="checkbox-field">
                <input type="checkbox" required />
                我已閱讀內容，了解未確認事項仍需查證，且建立草稿不代表平台已核准公開或收款。
              </label>
              <button className="button dark" disabled={busy}>
                建立活動專案 <ArrowUpRight size={16} />
              </button>
            </form>
          </section>
        )}
        {created && (
          <section className="panel">
            <span className="eyebrow">YOUR NEXT STAGE IS READY</span>
            <h2>活動草稿已建立</h2>
            <p>{created.title}</p>
            <div className="form-actions">
              <Link
                className="button dark"
                href={"/studio?project=" + created.id}
              >
                進入活動工作室 <ArrowUpRight size={16} />
              </Link>
              <button
                className="button outline"
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    await api("submit-project", { id: created.id });
                    setCreated({ ...created, review_status: "pending" });
                  })
                }
              >
                {created.review_status === "pending"
                  ? "已送平台審核"
                  : "送平台審核"}
              </button>
            </div>
          </section>
        )}
        {step > 1 && !created && (
          <button className="small-button" onClick={() => setStep(step - 1)}>
            返回上一步
          </button>
        )}
      </section>
    </>
  );
}
