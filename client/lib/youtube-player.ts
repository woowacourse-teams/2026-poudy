/**
 * YouTube IFrame Player API(https://developers.google.com/youtube/iframe_api_reference) 중 재생 시트가 쓰는 부분.
 * 이미 그린 iframe(주소에 enablejsapi=1)에 플레이어를 붙여 지금 재생 시각과 재생 상태를 읽는다.
 */

/** 플레이어 상태 값. API 의 YT.PlayerState 와 같다. */
export const PLAYER_PLAYING = 1;

export type YouTubePlayer = {
  readonly getCurrentTime: () => number;
};

type PlayerEvent = { readonly target: YouTubePlayer; readonly data?: unknown };

export type YouTubePlayerApi = {
  readonly Player: new (
    element: HTMLIFrameElement,
    options: {
      readonly events: {
        readonly onReady?: (event: PlayerEvent) => void;
        readonly onStateChange?: (event: PlayerEvent) => void;
      };
    },
  ) => YouTubePlayer;
};

declare global {
  interface Window {
    YT?: YouTubePlayerApi;
    onYouTubeIframeAPIReady?: () => void;
  }
}

const API_SRC = "https://www.youtube.com/iframe_api";

let loading: Promise<YouTubePlayerApi> | undefined;

/**
 * API 스크립트를 한 번만 받는다. 받기 전에 다른 곳이 이미 받았으면 그것을 쓰고, 받지 못했으면 다음에 다시 받는다.
 * 스크립트는 다 받으면 전역의 onYouTubeIframeAPIReady 를 부른다. 다른 곳이 걸어 둔 함수가 있으면 함께 부른다.
 */
export const loadYouTubePlayerApi = (): Promise<YouTubePlayerApi> => {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  loading ??= new Promise<YouTubePlayerApi>((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      if (window.YT?.Player) resolve(window.YT);
      else reject(new Error("YouTube IFrame Player API 를 찾지 못했어요"));
    };
    const script = document.createElement("script");
    script.src = API_SRC;
    script.async = true;
    script.onerror = () => {
      loading = undefined;
      script.remove();
      reject(new Error("YouTube IFrame Player API 를 받지 못했어요"));
    };
    document.head.append(script);
  });
  return loading;
};

/** 플레이어가 돌려준 재생 시각(초)을 ms 로 바꾼다. 바깥에서 온 값이라 숫자가 아니면 버린다. */
export const playerTimeMs = (player: YouTubePlayer): number | undefined => {
  const seconds: unknown = player.getCurrentTime();
  return typeof seconds === "number" && Number.isFinite(seconds) && seconds >= 0
    ? Math.round(seconds * 1000)
    : undefined;
};
