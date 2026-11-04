export async function api<T = Record<string, any>>(
  action: string,
  data?: unknown,
  params: Record<string, string> = {},
  legacy = false,
): Promise<T> {
  const r = await fetch(
    (legacy ? "/api/workspace" : "/api/core") +
      "?" +
      new URLSearchParams({ action, ...params }),
    {
      method: data === undefined ? "GET" : "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      ...(data === undefined ? {} : { body: JSON.stringify(data) }),
    },
  );
  let d;
  try {
    d = await r.json();
  } catch {
    throw Error("連線暫時中斷，請稍後重試");
  }
  if (!r.ok || d.ok === false)
    throw Object.assign(Error(d.error || "操作失敗"), { status: r.status });
  return d;
}
export function exportCsv(name: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]);
  const quote = (v: unknown) => {
    const s = typeof v === "object" ? JSON.stringify(v) : String(v ?? "");
    return (
      '"' + (/^[\s]*[=+@-]/.test(s) ? "'" : "") + s.replaceAll('"', '""') + '"'
    );
  };
  const blob = new Blob(
    [
      "\uFEFF" +
        [keys, ...rows.map((r) => keys.map((k) => r[k]))]
          .map((r) => r.map(quote).join(","))
          .join("\r\n"),
    ],
    { type: "text/csv;charset=utf-8" },
  );
  const a = document.createElement("a"),
    url = URL.createObjectURL(blob);
  a.href = url;
  a.download = name + ".csv";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}
