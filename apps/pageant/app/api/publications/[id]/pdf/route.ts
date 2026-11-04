import { NextRequest, NextResponse } from "next/server";
import { getCatalog } from "@/lib/catalog";
import { publicationPdf } from "@/lib/pdf";
import { resolveSite } from "@/lib/site";
export const runtime = "nodejs";
export const maxDuration = 120;
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params,
      data = await getCatalog(),
      book = data.publications.find((b) => b.id === id),
      site = await resolveSite(req.headers.get("host") || "");
    if (!book || !site)
      return new NextResponse("會刊尚未公開", { status: 404 });
    if (site.kind === "brand") {
      const p = data.projects.find((p) => p.id === book.project_id),
        b = data.brands.find((b) => b.id === p?.brand_id);
      if (b?.slug !== site.slug)
        return new NextResponse("會刊尚未公開", { status: 404 });
    }
    const pdf = await publicationPdf(book);
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${book.slug}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "PDF暫時無法產生，請改用會刊頁的列印／另存PDF。" },
      { status: 503 },
    );
  }
}
