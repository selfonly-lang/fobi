import { notFound } from "next/navigation";
import { getCatalog } from "@/lib/catalog";
import { MISS_TAIWAN } from "@/lib/miss-taiwan";
import { taiwanMetadata } from "@/lib/website";
import { MissTaiwanHome } from "@/components/miss-taiwan";
export const generateMetadata = taiwanMetadata;
export default async function Page() {
  const data = await getCatalog(),
    project = data.projects.find((p) => p.id === MISS_TAIWAN.project_id);
  if (!project) notFound();
  return <MissTaiwanHome data={data} project={project} />;
}
