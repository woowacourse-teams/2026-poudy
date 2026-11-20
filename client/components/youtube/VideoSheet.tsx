"use client";

import { BottomSheet, BottomSheetBody, BottomSheetHeader } from "@poudy/design-system/bottom-sheet";
import { Icon } from "@poudy/design-system/icon";
import { usePressable } from "@poudy/design-system/use-pressable";
import { type RefObject, useEffect, useRef, useState } from "react";

import { OpinionTag } from "./Opinion";
import { TimeChip, timeChipSlot, videoMentionLines, type TimeChipSlot, type VideoMentionLine } from "./VideoMentions";

import type { YouTubeVideo } from "@/lib/api/youtube";
import { formatDate } from "@/lib/domain/format";
import { keepWords } from "@/lib/youtube-format";
import { loadYouTubePlayerApi, PLAYER_PLAYING, playerTimeMs, type YouTubePlayer } from "@/lib/youtube-player";

type VideoSheetProps = {
  /** 재생할 영상. 없으면 시트를 닫는다. */
  readonly video: YouTubeVideo | undefined;
  /** 재생을 시작한 시각(ms). 0 이면 처음부터다. */
  readonly startMs: number;
  /** 누른 언급의 시각. 영상 머리로 열었으면 없다. 같은 줄을 다시 눌러도 그 시각부터 다시 틀도록 플레이어를 새로 그리는 데 쓴다. */
  readonly activeMs: number | undefined;
  readonly onPlay: (line: VideoMentionLine) => void;
  readonly onExternalLink: (video: YouTubeVideo) => void;
  readonly onClose: () => void;
};

/** 재생 중일 때 플레이어의 시각을 읽는 간격. 시각 칩은 초 단위라 이보다 촘촘할 필요가 없다. */
export const PLAYER_POLL_MS = 500;

/** 사용자가 언급 목록을 직접 움직인 뒤 이 시간 동안은 재생 중 줄을 따라 목록을 옮기지 않는다. */
export const MANUAL_SCROLL_HOLD_MS = 4000;

/**
 * 지금 재생 시각에 해당하는 줄. 시작 시각이 지금 시각 이하인 줄 가운데 가장 늦은 줄이고, 첫 언급 전이면 없다.
 * 플레이어는 주소의 start=(초 단위)부터 틀어, 누른 언급의 시각을 초 아래에서 버린 자리에서 시작한다. 그래서 언급의 시각도
 * 초 단위로 내려 비교한다. 그러지 않으면 1:04.1 을 눌렀는데 1:04.0 에서 시작해 잠깐 앞 줄이 재생 중으로 보인다.
 */
export const playingLineIndex = (lines: readonly VideoMentionLine[], currentMs: number) => {
  let found = -1;
  lines.forEach((line, index) => {
    if (Math.floor(line.mention.startMs / 1000) * 1000 <= currentMs) found = index;
  });
  return found;
};

/**
 * 영상 재생 시트(명세 S295 · S296 · S296-1). 시트 안에는 그 영상과 그 영상의 언급만 두어, 어느 언급을 눌러도 지금 영상의 그 시각으로 넘어간다.
 *
 * - 플레이어는 시트 위쪽에 고정하고 언급 목록만 스크롤한다. 플레이어는 끌기 손잡이가 아니라 끌어 닫히지 않는다.
 * - 닫기는 ✕, 손잡이 줄 끌기, 딤, Esc. 닫으면 연 자리로 포커스가 돌아간다.
 * - 재생 중 표시는 플레이어의 재생 시각을 따른다. 영상이 흘러 다음 언급에 닿거나 플레이어에서 직접 옮기면 표시도 옮겨 간다.
 */
export function VideoSheet({ video, startMs, activeMs, onPlay, onExternalLink, onClose }: VideoSheetProps) {
  return (
    <BottomSheet open={video !== undefined} onClose={onClose}>
      {video ? (
        <SheetContent
          key={video.id}
          video={video}
          startMs={startMs}
          // 시각을 바꾸면 start= 주소로 다시 불러온다. key 를 바꿔 같은 시각을 다시 눌러도 그 자리부터 다시 튼다.
          playerKey={`${video.id}-${startMs}-${activeMs ?? "head"}`}
          onPlay={onPlay}
          onExternalLink={onExternalLink}
          onClose={onClose}
        />
      ) : null}
    </BottomSheet>
  );
}

function SheetContent({
  video,
  startMs,
  playerKey,
  onPlay,
  onExternalLink,
  onClose,
}: {
  readonly video: YouTubeVideo;
  readonly startMs: number;
  readonly playerKey: string;
  readonly onPlay: (line: VideoMentionLine) => void;
  readonly onExternalLink: (video: YouTubeVideo) => void;
  readonly onClose: () => void;
}) {
  const playerRef = useRef<HTMLIFrameElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  // 플레이어가 알려 주기 전에는 시작한 시각을 지금 시각으로 본다. 누른 줄이 바로 재생 중으로 보인다.
  const currentMs = usePlayerTime(playerRef, playerKey, startMs);
  const lines = videoMentionLines(video);
  const playingIndex = playingLineIndex(lines, currentMs);
  useFollowPlayingLine(listRef, playingIndex);

  return (
    <>
      <BottomSheetHeader title={<span className="line-clamp-2">{keepWords(video.title)}</span>} onClose={onClose} />
      <div className="flex shrink-0 flex-col gap-3 px-5 pb-2">
        <iframe
          key={playerKey}
          ref={playerRef}
          title={video.title}
          // enablejsapi 를 켜야 IFrame Player API 가 이 플레이어의 재생 시각을 읽는다.
          src={`https://www.youtube-nocookie.com/embed/${video.id}?start=${Math.floor(startMs / 1000)}&autoplay=1&enablejsapi=1`}
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
          className="aspect-video w-full rounded-xl border-0 bg-action"
        />
        <div className="flex items-center justify-between gap-3">
          <p className="text-caption text-text-secondary">{formatDate(video.publishedAt)}</p>
          <ExternalLink video={video} onClick={() => onExternalLink(video)} />
        </div>
      </div>
      <BottomSheetBody>
        <ul ref={listRef} aria-label="이 영상의 언급" className="flex flex-col pb-4">
          {lines.map((line, index) => (
            <li key={line.mention.ordinal} data-playing={index === playingIndex ? "" : undefined}>
              <SheetMentionRow
                line={line}
                slot={timeChipSlot(video)}
                playing={index === playingIndex}
                onPlay={() => onPlay(line)}
              />
            </li>
          ))}
        </ul>
      </BottomSheetBody>
    </>
  );
}

/**
 * 플레이어의 지금 재생 시각(ms). IFrame Player API 를 받아 이 iframe 에 붙이고, 재생 중일 때만 PLAYER_POLL_MS 마다 시각을 읽는다.
 * 멈추거나 옮기면 상태가 바뀌는 때 한 번 읽는다. 시트가 닫히면(이 칸이 사라지면) 읽기를 멈춘다.
 * API 를 받지 못하면 시작한 시각에 머문다. 누른 줄의 표시는 그대로 남는다.
 */
function usePlayerTime(playerRef: RefObject<HTMLIFrameElement | null>, playerKey: string, startMs: number) {
  // 플레이어를 새로 그리면(다른 줄을 누름) 그 플레이어가 알려 주기 전까지 새 시작 시각을 쓴다.
  const [time, setTime] = useState({ key: playerKey, ms: startMs });
  useEffect(() => {
    const element = playerRef.current;
    if (!element) return;
    let disposed = false;
    let timer: ReturnType<typeof setInterval> | undefined;
    const read = (player: YouTubePlayer) => {
      const ms = playerTimeMs(player);
      if (!disposed && ms !== undefined) setTime({ key: playerKey, ms });
    };
    const stop = () => {
      if (timer !== undefined) clearInterval(timer);
      timer = undefined;
    };
    loadYouTubePlayerApi()
      .then((api) => {
        if (disposed) return;
        new api.Player(element, {
          events: {
            onStateChange: ({ target, data }) => {
              if (disposed) return;
              read(target);
              stop();
              if (data === PLAYER_PLAYING) timer = setInterval(() => read(target), PLAYER_POLL_MS);
            },
          },
        });
      })
      .catch(() => {
        // 받지 못하면 표시는 시작한 줄에 머문다. 재생에는 지장이 없다.
      });
    return () => {
      disposed = true;
      stop();
    };
  }, [playerRef, playerKey]);
  return time.key === playerKey ? time.ms : startMs;
}

/**
 * 재생 중 줄이 바뀌면 그 줄이 보이도록 언급 목록만 옮긴다. 줄이 이미 다 보이면 옮기지 않는다.
 * 사용자가 목록을 직접 움직이는 중이거나 움직인 지 MANUAL_SCROLL_HOLD_MS 가 지나지 않았으면 끌어오지 않는다.
 * 시트를 처음 열 때는 움직임 없이 바로 그 줄로 옮기고, 재생을 따라 옮길 때는 부드럽게 옮긴다(움직임 줄이기에서는 바로).
 */
function useFollowPlayingLine(listRef: RefObject<HTMLUListElement | null>, playingIndex: number) {
  const lastManual = useRef(Number.NEGATIVE_INFINITY);
  const first = useRef(true);
  useEffect(() => {
    const body = listRef.current?.closest<HTMLElement>("[data-sheet-body]");
    if (!body) return;
    const mark = () => {
      lastManual.current = Date.now();
    };
    const events = ["wheel", "touchstart", "touchmove", "pointerdown", "keydown"] as const;
    events.forEach((name) => body.addEventListener(name, mark, { passive: true }));
    return () => events.forEach((name) => body.removeEventListener(name, mark));
  }, [listRef]);
  useEffect(() => {
    const initial = first.current;
    first.current = false;
    if (playingIndex < 0) return;
    if (!initial && Date.now() - lastManual.current < MANUAL_SCROLL_HOLD_MS) return;
    const row = listRef.current?.children[playingIndex];
    const body = listRef.current?.closest<HTMLElement>("[data-sheet-body]");
    if (!(row instanceof HTMLElement) || !body) return;
    const view = body.getBoundingClientRect();
    const box = row.getBoundingClientRect();
    const offset = box.top < view.top ? box.top - view.top : box.bottom > view.bottom ? box.bottom - view.bottom : 0;
    if (offset === 0) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    body.scrollTo?.({ top: body.scrollTop + offset, behavior: initial || reduce ? "auto" : "smooth" });
  }, [listRef, playingIndex]);
}

/**
 * 시트의 언급 줄. 줄 전체가 그 시각부터 재생하는 버튼이고, hover 면은 시트 폭 끝까지 깐다(S04).
 * 포커스 링은 줄 안쪽에 그린다. 바깥에 그리면 스크롤 칸의 위 끝에 닿은 줄(첫 줄 등)에서 링의 윗변이 잘린다.
 */
function SheetMentionRow({
  line,
  slot,
  playing,
  onPlay,
}: {
  readonly line: VideoMentionLine;
  readonly slot: TimeChipSlot;
  readonly playing: boolean;
  readonly onPlay: () => void;
}) {
  const { pressableProps } = usePressable({ delayMs: 80 });
  const { mention } = line;
  return (
    <button
      type="button"
      aria-pressed={playing}
      onClick={onPlay}
      {...pressableProps}
      className="pressable fb-bleed flex w-full items-start gap-3 py-3 text-left select-none focus-visible:-outline-offset-2"
    >
      <TimeChip ms={mention.startMs} slot={slot} playing={playing} />
      <span className="flex min-w-0 flex-1 flex-col items-start gap-1">
        <OpinionTag recommendation={line.recommendation} />
        <span className="text-body font-semibold text-text-primary">{keepWords(mention.summary)}</span>
        <span className="w-full truncate text-caption text-text-secondary">
          {mention.brandName} · {mention.productName}
        </span>
      </span>
    </button>
  );
}

/**
 * 이 영상을 YouTube 에서 여는 바깥 링크(기존 동작, 명세 S295 · S296 날짜 줄 오른쪽).
 * hover · 눌림은 글자 밑줄이다. 같은 시트의 날짜 줄에 놓인 12 글자 링크라, 면을 깔면 글자에 붙은 작은 알약이 되어 아래 언급 줄의 폭 가득 면과도 어긋난다.
 * 영상 탭 언급 줄의 제품 링크와 같은 규칙이다. 누르는 영역은 높이 44 로 둔다.
 */
function ExternalLink({ video, onClick }: { readonly video: YouTubeVideo; readonly onClick: () => void }) {
  const { pressableProps } = usePressable();
  return (
    <a
      href={`https://www.youtube.com/watch?v=${video.id}`}
      onClick={onClick}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${video.title} YouTube에서 열기`}
      {...pressableProps}
      className="pressable flex min-h-11 shrink-0 items-center gap-0.5 text-caption font-semibold text-text-secondary select-none data-hovered:underline data-pressed:underline"
    >
      YouTube
      <Icon name="chevron-right" size={12} />
    </a>
  );
}
