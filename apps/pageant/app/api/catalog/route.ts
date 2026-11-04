import { getCatalog } from "@/lib/catalog";
export async function GET() {
  try {
    return Response.json(await getCatalog(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return Response.json({ error: "內容服務暫時無法載入" }, { status: 503 });
  }
}
