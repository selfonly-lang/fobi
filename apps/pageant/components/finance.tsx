"use client";
import { useState } from "react";
import { Download, Plus, RefreshCw } from "lucide-react";
import { api, exportCsv } from "@/lib/client-api";
import { money, statusLabel } from "@/lib/domain";
import { Badge, Dialog, Field } from "./controls";
import { RecordEditor, type Doc } from "./editors";
export function DataTable({
  rows,
  columns,
}: {
  rows: Doc[];
  columns: [string, string][];
}) {
  return (
    <div className="panel-table">
      <table>
        <thead>
          <tr>
            {columns.map(([k, l]) => (
              <th key={k}>{l}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id || i}>
              {columns.map(([k]) => (
                <td key={k}>
                  {["status", "payment_status"].includes(k)
                    ? statusLabel[r[k]] || r[k]
                    : k === "amount"
                      ? money(r[k])
                      : typeof r[k] === "object"
                        ? JSON.stringify(r[k])
                        : String(r[k] ?? "—")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && (
        <p className="muted" style={{ padding: 20 }}>
          目前沒有資料。
        </p>
      )}
    </div>
  );
}
export function FinancePanel({
  project,
  role,
  globalRole,
  data,
  assets,
  onSaved,
}: {
  project: Doc;
  role: string;
  globalRole: string;
  data: Doc | null;
  assets: Doc[];
  onSaved: () => Promise<void>;
}) {
  const [tab, setTab] = useState("orders"),
    [modal, setModal] = useState<Doc | null>(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [legacy, setLegacy] = useState<Doc | null>(null);
  const financial = ["owner", "finance"].includes(globalRole);
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  if (!data)
    return (
      <section className="panel">
        <p>正在讀取帳務資料…</p>
      </section>
    );
  return (
    <>
      <div className="studio-stats">
        <div>
          <span>平台新制成交</span>
          <strong>
            {money(
              data.entries
                .filter((e: Doc) => e.kind === "sale")
                .reduce((n: number, e: Doc) => n + e.amount, 0),
            )}
          </strong>
        </div>
        <div>
          <span>退款沖銷</span>
          <strong>
            {money(
              -data.entries
                .filter((e: Doc) => e.kind === "refund")
                .reduce((n: number, e: Doc) => n + e.amount, 0),
            )}
          </strong>
        </div>
        <div>
          <span>平台服務費淨額</span>
          <strong>
            {money(
              -data.entries
                .filter((e: Doc) => e.kind === "commission")
                .reduce((n: number, e: Doc) => n + e.amount, 0),
            )}
          </strong>
        </div>
        <div>
          <span>待結算餘額</span>
          <strong>{money(data.balance)}</strong>
        </div>
      </div>
      <nav className="workspace-tabs">
        {[
          ["orders", "訂單與發票"],
          ["ledger", "收支與憑證"],
          ["refunds", "退款審核"],
          ["settlements", "主辦結算"],
          ["fees", "抽成規則"],
          ...(project.slug === "fobi-2026"
            ? [["legacy", "FOBI 歷史票務"]]
            : []),
        ].map(([id, l]) => (
          <button
            key={id}
            className={tab === id ? "active" : ""}
            onClick={() => {
              setTab(id);
              if (id === "legacy" && !legacy)
                run(async () =>
                  setLegacy(
                    await api(
                      "legacy",
                      undefined,
                      { project: project.id },
                      true,
                    ),
                  ),
                );
            }}
          >
            {l}
          </button>
        ))}
      </nav>
      {error && (
        <div className="alert" role="alert">
          {error}
        </div>
      )}
      {notice && (
        <div className="notice" role="status">
          {notice}
        </div>
      )}
      {tab === "orders" && (
        <section className="panel">
          <div className="panel-top">
            <h2>活動訂單</h2>
            <button
              className="small-button"
              onClick={() =>
                exportCsv(
                  "活動訂單",
                  data.orders.map((o: Doc) => ({
                    訂單: o.order_no,
                    數量: o.quantity,
                    金額: o.amount,
                    狀態: statusLabel[o.status],
                    已退款: o.refunded_amount,
                    建立時間: o.created_at,
                  })),
                )
              }
            >
              <Download size={14} />
              匯出
            </button>
          </div>
          {data.orders.map((o: Doc) => (
            <div className="list-row" key={o.id}>
              <div>
                <h3>{o.order_no}</h3>
                <p>
                  {o.quantity} 張 · {money(o.amount)} ·{" "}
                  {o.buyer_info?.name || "會員訂單"}
                </p>
                <p>
                  發票：
                  {data.invoices?.find((i: Doc) => i.order_id === o.id)
                    ?.invoice_no || "尚未記錄實際開立"}
                </p>
              </div>
              <Badge status={o.status} />
              {financial &&
                ["paid", "partially_refunded", "refunded"].includes(
                  o.status,
                ) && (
                  <button
                    className="small-button"
                    onClick={() => setModal({ type: "invoice", order: o })}
                  >
                    記錄外部發票
                  </button>
                )}
            </div>
          ))}
          {!data.orders.length && (
            <p className="muted">
              此專案尚無平台新制訂單。歷史 FOBI 紀錄請切換至「FOBI 歷史票務」。
            </p>
          )}
        </section>
      )}
      {tab === "ledger" && (
        <section className="panel">
          <div className="panel-top">
            <h2>活動收支紀錄</h2>
            <div className="studio-toolbar">
              <button
                className="small-button"
                onClick={() =>
                  exportCsv(
                    "活動收支",
                    data.entries.map((e: Doc) => ({
                      時間: e.created_at,
                      類型: e.kind,
                      金額: e.amount,
                      說明: e.description,
                    })),
                  )
                }
              >
                <Download size={14} />
                會計匯出
              </button>
              <button
                className="button dark"
                onClick={() =>
                  setModal({
                    type: "expense",
                    initial: { kind: "expense", amount: "", description: "" },
                  })
                }
              >
                <Plus size={15} />
                記錄支出
              </button>
            </div>
          </div>
          <DataTable
            rows={data.entries}
            columns={[
              ["created_at", "時間"],
              ["kind", "分類"],
              ["amount", "金額"],
              ["description", "用途與來源"],
            ]}
          />
          <p className="muted">
            原交易保留；退款及修正使用沖銷紀錄。發票僅在有實際號碼及憑證時記錄為已開立。
          </p>
        </section>
      )}
      {tab === "refunds" && (
        <section className="panel">
          <h2>退款審核</h2>
          {data.refunds.length ? (
            data.refunds.map((r: Doc) => (
              <div className="list-row" key={r.id}>
                <div>
                  <h3>
                    {r.order?.order_no} · {money(r.amount)}
                  </h3>
                  <p>{r.reason}</p>
                </div>
                <Badge status={r.status} />
                {financial && ["requested", "failed"].includes(r.status) && (
                  <>
                    <button
                      className="small-button"
                      disabled={busy}
                      onClick={() =>
                        run(async () => {
                          await api("review-refund", {
                            id: r.id,
                            status: "approved",
                          });
                          await onSaved();
                        })
                      }
                    >
                      核准
                    </button>
                    <button
                      className="small-button"
                      disabled={busy}
                      onClick={() =>
                        run(async () => {
                          await api("review-refund", {
                            id: r.id,
                            status: "rejected",
                          });
                          await onSaved();
                        })
                      }
                    >
                      退回
                    </button>
                  </>
                )}
                {financial && r.status === "approved" && (
                  <>
                    <button
                      className="small-button"
                      disabled={busy}
                      onClick={() => {
                        if (
                          confirm("確認向綠界申請本筆退刷？這會執行實際退款。")
                        )
                          run(async () => {
                            await api("execute-refund", { id: r.id });
                            await onSaved();
                            setNotice(
                              "綠界已確認受理退款，實際入帳時間依銀行作業。",
                            );
                          });
                      }}
                    >
                      送出綠界退刷
                    </button>
                    <button
                      className="small-button"
                      onClick={() =>
                        setModal({ type: "manual-refund", refund: r })
                      }
                    >
                      記錄人工退款
                    </button>
                  </>
                )}
              </div>
            ))
          ) : (
            <p>目前沒有退款申請。</p>
          )}
        </section>
      )}
      {tab === "settlements" && (
        <section className="panel">
          <div className="panel-top">
            <h2>主辦結算</h2>
            <button
              className="button dark"
              disabled={busy}
              onClick={() => {
                if (
                  confirm(
                    "依目前收支餘額提出結算申請？須已結案且完成退款處理。",
                  )
                )
                  run(async () => {
                    await api("request-settlement", { project_id: project.id });
                    await onSaved();
                    setNotice("結算申請已建立，待財務覆核。");
                  });
              }}
            >
              提出結算申請
            </button>
          </div>
          <p>
            帳面餘額為 {money(data.balance)}
            ；申請不代表已撥款。實際付款須由平台財務核對並記錄銀行憑證。
          </p>
          {data.settlements.map((s: Doc) => (
            <div className="list-row" key={s.id}>
              <div>
                <h3>{money(s.amount)}</h3>
                <p>
                  {new Date(s.created_at).toLocaleString("zh-TW")} ·{" "}
                  {s.bank_reference || "尚無實際撥款紀錄"}
                </p>
              </div>
              <Badge status={s.status} />
              {financial && ["requested", "review"].includes(s.status) && (
                <button
                  className="small-button"
                  disabled={busy}
                  onClick={() =>
                    run(async () => {
                      await api("review-settlement", {
                        id: s.id,
                        status: "approved",
                      });
                      await onSaved();
                    })
                  }
                >
                  覆核通過
                </button>
              )}
              {financial && s.status === "approved" && (
                <button
                  className="small-button"
                  onClick={() => setModal({ type: "payout", settlement: s })}
                >
                  記錄實際撥款
                </button>
              )}
            </div>
          ))}
        </section>
      )}
      {tab === "fees" && (
        <section className="panel">
          <h2>本專案成交費率</h2>
          <p>
            票券、課程與贊助分別設定，專案議約優先於平台標準費率。成交時鎖定規則，不回溯變更既有訂單。
          </p>
          {["ticket", "course", "sponsor"].map((kind) => {
            const f =
              data.fees.find(
                (f: Doc) => f.kind === kind && f.project_id === project.id,
              ) || data.fees.find((f: Doc) => f.kind === kind && !f.project_id);
            return (
              <div className="list-row" key={kind}>
                <div>
                  <h3>
                    {{ ticket: "票券", course: "課程", sponsor: "贊助" }[kind]}{" "}
                    · {f?.project_id ? "專案議約" : "平台標準"}
                  </h3>
                  <p>
                    {f?.rate_bps === null || f?.rate_bps === undefined
                      ? "費率尚未設定"
                      : f.rate_bps / 100 + "%"}{" "}
                    · {f?.enabled ? "已啟用" : "尚未啟用"} · 金流費：
                    {f?.gateway_fee_bearer === "organizer"
                      ? "主辦負擔"
                      : f?.gateway_fee_bearer === "platform"
                        ? "平台負擔"
                        : "待約定"}
                  </p>
                </div>
                {globalRole === "owner" && (
                  <button
                    className="small-button"
                    onClick={() =>
                      setModal({
                        type: "fee",
                        fee: { ...f, project_id: project.id, kind },
                      })
                    }
                  >
                    設定專案費率
                  </button>
                )}
              </div>
            );
          })}
        </section>
      )}
      {tab === "legacy" && (
        <>
          <div className="notice">
            下列為原 FOBI
            票務資料，維持唯讀，未重新開賣；不自動重算或併入平台新制抽成帳務。
          </div>
          <section className="panel">
            <h2>歷史訂單</h2>
            {legacy ? (
              <DataTable
                rows={legacy.orders}
                columns={[
                  ["order_no", "訂單"],
                  ["type", "類型"],
                  ["amount", "金額"],
                  ["payment_status", "付款狀態"],
                  ["created_at", "建立時間"],
                ]}
              />
            ) : (
              <p>正在讀取…</p>
            )}
          </section>
          <section className="panel">
            <h2>歷史票券</h2>
            {legacy && (
              <DataTable
                rows={legacy.tickets}
                columns={[
                  ["ticket_no", "票號"],
                  ["holder_name", "持票人"],
                  ["company", "公司"],
                  ["status", "狀態"],
                  ["checked_in_at", "核銷時間"],
                ]}
              />
            )}
          </section>
        </>
      )}
      {modal?.type === "expense" && (
        <RecordEditor
          type="expense"
          initial={modal.initial}
          projectId={project.id}
          assets={assets}
          onClose={() => setModal(null)}
          onSaved={onSaved}
        />
      )}
      {modal && ["manual-refund", "payout", "invoice"].includes(modal.type) && (
        <Dialog
          title={
            modal.type === "manual-refund"
              ? "記錄已完成的人工退款"
              : modal.type === "payout"
                ? "記錄已完成的銀行撥款"
                : "記錄實際開立的外部發票"
          }
          onClose={() => setModal(null)}
        >
          <>
            {error && (
              <div className="alert" role="alert">
                {error}
              </div>
            )}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                run(async () => {
                  if (modal.type === "manual-refund")
                    await api("confirm-manual-refund", {
                      id: modal.refund.id,
                      reference: fd.get("reference"),
                      proof_asset_id: fd.get("proof_asset_id"),
                    });
                  if (modal.type === "payout")
                    await api("confirm-payout", {
                      id: modal.settlement.id,
                      reference: fd.get("reference"),
                      proof_asset_id: fd.get("proof_asset_id"),
                    });
                  if (modal.type === "invoice")
                    await api("invoice-record", {
                      order_id: modal.order.id,
                      status: fd.get("status"),
                      invoice_no: fd.get("reference"),
                      proof_asset_id: fd.get("proof_asset_id"),
                    });
                  setModal(null);
                  await onSaved();
                  setNotice("實際帳務紀錄已保存。");
                });
              }}
            >
              {modal.type === "invoice" && (
                <Field label="發票狀態">
                  <select name="status">
                    <option value="issued">已外部開立</option>
                    <option value="void">已實際作廢</option>
                  </select>
                </Field>
              )}
              <Field
                label={
                  modal.type === "invoice"
                    ? "實際發票號碼"
                    : "銀行／交易確認編號"
                }
              >
                <input
                  name="reference"
                  required
                  minLength={3}
                  maxLength={200}
                />
              </Field>
              <Field label="實際憑證（請先於素材庫上傳）">
                <select name="proof_asset_id" required>
                  <option value="">選擇憑證</option>
                  {assets.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.filename}
                    </option>
                  ))}
                </select>
              </Field>
              <label className="checkbox-field">
                <input type="checkbox" required />
                我已核對真實交易及憑證，這不是模擬紀錄。
              </label>
              <button className="button dark" disabled={busy}>
                確認保存紀錄
              </button>
            </form>
          </>
        </Dialog>
      )}
      {modal?.type === "fee" && (
        <FeeEditor
          initial={modal.fee}
          onClose={() => setModal(null)}
          onSaved={onSaved}
        />
      )}
    </>
  );
}
export function FeeEditor({
  initial,
  onClose,
  onSaved,
}: {
  initial: Doc;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <Dialog title="成交抽成規則" onClose={onClose}>
      {error && <div className="alert">{error}</div>}
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          const fd = new FormData(e.currentTarget);
          try {
            await api("save-fee", {
              project_id: initial.project_id || null,
              kind: initial.kind,
              rate_bps:
                fd.get("percent") === ""
                  ? null
                  : Math.round(Number(fd.get("percent")) * 100),
              gateway_fee_bearer: fd.get("bearer") || null,
              terms: fd.get("terms"),
              enabled: fd.get("enabled") === "on",
            });
            await onSaved();
            onClose();
          } catch (err) {
            setError((err as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <p className="muted">
          費率未設定時不啟用收款；不替您預設實際扣款比例。
        </p>
        <Field label="抽成百分比">
          <input
            name="percent"
            type="number"
            min={0}
            max={100}
            step="0.01"
            defaultValue={
              initial.rate_bps === null || initial.rate_bps === undefined
                ? ""
                : initial.rate_bps / 100
            }
          />
        </Field>
        <Field label="金流費負擔方">
          <select name="bearer" defaultValue={initial.gateway_fee_bearer || ""}>
            <option value="">待約定</option>
            <option value="platform">平台</option>
            <option value="organizer">主辦</option>
          </select>
        </Field>
        <Field label="費率、金流費及結算約定">
          <textarea name="terms" rows={5} defaultValue={initial.terms || ""} />
        </Field>
        <label className="checkbox-field">
          <input
            name="enabled"
            type="checkbox"
            defaultChecked={initial.enabled}
          />
          費率及條款已確認，啟用此規則。
        </label>
        <button className="button dark" disabled={busy}>
          儲存費率
        </button>
      </form>
    </Dialog>
  );
}
