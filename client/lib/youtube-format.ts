export const countLabel = (count?: number | null) =>
  count == null
    ? "비공개"
    : new Intl.NumberFormat("ko-KR", { notation: "compact", maximumFractionDigits: 1 }).format(count);

const ONE_HOUR_MS = 60 * 60 * 1000;

/** 영상 안의 시각. 1시간이 넘으면 `1:02:03`, 아니면 `12:57` 이다. */
export const timestamp = (ms: number) => {
  const seconds = Math.floor(ms / 1000);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = String(seconds % 60).padStart(2, "0");
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, "0")}:${rest}` : `${minutes}:${rest}`;
};

/** 1시간이 넘는 영상인지. 이런 영상은 시각 칩 자리를 넓혀 모든 줄의 시각이 같은 폭에 놓이게 한다(S296). */
export const isLongVideo = (durationMs: number) => durationMs >= ONE_HOUR_MS;
