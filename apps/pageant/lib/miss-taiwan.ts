import season from "../content/miss-taiwan-2027.json";
export const MISS_TAIWAN = season;
export const isTaiwanInterest = (id: string) =>
  [season.interest_id, season.media_interest_id].includes(id);
export function roundGate(
  checks: { status: string }[],
  previousStatus?: string,
) {
  const complete =
    checks.length > 0 && checks.every((c) => c.status === "done");
  return complete
    ? "工作已完成"
    : previousStatus && previousStatus !== "done"
      ? "先完成前一場確認"
      : "籌備中";
}
