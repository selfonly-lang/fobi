import type { Metadata } from "next";
import { CreateEvent } from "@/components/create";
export const metadata: Metadata = {
  title: "活動製造機・建立你的活動",
  robots: { index: false, follow: false },
};
export default function Create() {
  return <CreateEvent />;
}
