import { notFound } from "next/navigation";
import { getCatalog } from "@/lib/catalog";
import { MISS_TAIWAN as season } from "@/lib/miss-taiwan";
import { MissTaiwanHome } from "@/components/miss-taiwan";
export const metadata = {
  title: "2027 台灣小姐選拔｜招募與五場賽事計畫",
  description:
    "2027 台灣小姐選拔規劃海選、才藝初賽、泳裝與禮服賽、國服賽及總決賽；2026 年 12 月中預定啟動記者會，現開放免費參賽意願登記。",
  alternates: { canonical: "https://pageant.self.com.tw/miss-taiwan" },
  openGraph: {
    title: "2027 台灣小姐｜妳的光，值得被世界看見",
    images: [
      {
        url: "https://pageant.self.com.tw/miss-taiwan-2027/campaign.webp",
        width: 1672,
        height: 941,
        alt: "AI 招募形象示意，非實際參賽者",
      },
    ],
  },
};
export default async function Page() {
  const data = await getCatalog(),
    project = data.projects.find((p) => p.id === season.project_id);
  if (!project) notFound();
  return <MissTaiwanHome data={data} project={project} />;
}
