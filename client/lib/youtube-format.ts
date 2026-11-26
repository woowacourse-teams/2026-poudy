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

const WORD_JOINER = "⁠";

/**
 * 띄어 쓴 낱말 안의 문장 부호(·, …, →, 쉼표 등) 앞뒤에 단어 결합자(U+2060)를 넣어, 줄이 띄어쓰기에서만 바뀌게 한다.
 *
 * 한국어 줄바꿈(keep-all)이어도 브라우저는 '세럼·크림'의 가운뎃점 뒤나 '갈아탔어요...여름'의 마침표 뒤에서 줄을 넘겨,
 * 글자를 키우면 낱말이 두 줄로 갈라진다. 결합자를 넣으면 낱말이 통째로 다음 줄로 간다. 낱말 하나가 줄보다 길 때만
 * overflow-wrap 이 글자 사이에서 끊는다. 결합자는 폭이 없고 낭독기는 읽지 않는다. 유튜버 화면의 요약 · 제목 · 이름에 쓴다.
 */
export const keepWords = (text: string) =>
  text.replace(/[^\s\p{L}\p{N}⁠](?=[^\s⁠])|[^\s⁠](?=[^\s\p{L}\p{N}⁠])/gu, (char) => `${char}${WORD_JOINER}`);

/** 유튜브 채널 사진을 내주는 호스트. 주소 끝의 `=` 옵션으로 크기와 형식을 바꿔 준다. */
const YOUTUBE_IMAGE = /^(https:\/\/yt3\.(?:googleusercontent|ggpht)\.com\/[^=?#]+)=[^/?#]*$/;

/**
 * 채널 프로필 사진을 192px webp로 받는 주소. 유튜브가 주는 주소는 `=s800-c-k-c0x00ffffff-no-rj`라 800px JPEG가 온다.
 * 프로필 원은 가장 커도 64px이라 192px이면 3배 화면도 덮는다. `-rw`는 `-c-k-…-no-rj` 옵션과 함께 쓰면 JPEG가 그대로
 * 오므로 옵션을 통째로 바꾼다. 유튜브 사진 주소가 아니면 그대로 둔다.
 */
export const channelAvatarUrl = (url: string) => url.replace(YOUTUBE_IMAGE, "$1=s192-c-rw");
