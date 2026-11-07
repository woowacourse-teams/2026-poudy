export const countLabel = (count?: number | null) =>
  count == null
    ? "비공개"
    : new Intl.NumberFormat("ko-KR", { notation: "compact", maximumFractionDigits: 1 }).format(count);
export const dateLabel = (date: string) =>
  new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Seoul",
  }).format(new Date(date));
export const timestamp = (ms: number) => {
  const seconds = Math.floor(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
};
