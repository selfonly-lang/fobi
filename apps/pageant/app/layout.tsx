import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/public";
import { resolveSite } from "@/lib/site";
import "./globals.css";
export const metadata: Metadata = {
  title: {
    default: "SELF PAGEANT｜全球選美・時尚・人物・活動平台",
    template: "%s｜SELF PAGEANT",
  },
  description:
    "從全球選美、人物與品牌故事，到活動製作、課程、贊助與售票。SELF PAGEANT，讓每一個舞台與故事被看見。",
  metadataBase: new URL("https://pageant.self.com.tw"),
  robots: { index: true, follow: true },
  openGraph: {
    siteName: "SELF PAGEANT",
    locale: "zh_TW",
    type: "website",
    images: [
      {
        url: "https://fobi.self.com.tw/editorial/event-records/upload-6dcce6b28b84.jpg",
        width: 1280,
        height: 960,
      },
    ],
  },
};
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const h = await headers(),
    site = await resolveSite(h.get("host") || "");
  if (!site) notFound();
  const privatePage = /^\/(studio|account|login|create|checkout)/.test(
    h.get("x-pageant-path") || "",
  );
  return (
    <html lang="zh-Hant">
      <body>
        <a className="skip-link" href="#main-content">
          跳至主要內容
        </a>
        {!privatePage && <Navigation site={site} />}
        <main id="main-content">{children}</main>
        {!privatePage && <Footer site={site} />}
      </body>
    </html>
  );
}
