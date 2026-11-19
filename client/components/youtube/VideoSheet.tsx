"use client";

import { BottomSheet, BottomSheetBody, BottomSheetHeader } from "@poudy/design-system/bottom-sheet";
import { Icon } from "@poudy/design-system/icon";
import { usePressable } from "@poudy/design-system/use-pressable";

import { OpinionTag } from "./Opinion";
import { TimeChip, timeChipSlot, videoMentionLines, type TimeChipSlot, type VideoMentionLine } from "./VideoMentions";

import type { YouTubeVideo } from "@/lib/api/youtube";
import { formatDate } from "@/lib/domain/format";
import { keepWords } from "@/lib/youtube-format";

type VideoSheetProps = {
  /** 재생할 영상. 없으면 시트를 닫는다. */
  readonly video: YouTubeVideo | undefined;
  /** 재생을 시작한 시각(ms). 0 이면 처음부터다. */
  readonly startMs: number;
  /** 누른 언급의 시각. 그 줄의 시각 칩을 채운다. 영상 머리로 열었으면 없다. */
  readonly activeMs: number | undefined;
  readonly onPlay: (line: VideoMentionLine) => void;
  readonly onExternalLink: (video: YouTubeVideo) => void;
  readonly onClose: () => void;
};

/**
 * 영상 재생 시트(명세 S295 · S296 · S296-1). 시트 안에는 그 영상과 그 영상의 언급만 두어, 어느 언급을 눌러도 지금 영상의 그 시각으로 넘어간다.
 *
 * - 플레이어는 시트 위쪽에 고정하고 언급 목록만 스크롤한다. 플레이어는 끌기 손잡이가 아니라 끌어 닫히지 않는다.
 * - 닫기는 ✕, 손잡이 줄 끌기, 딤, Esc. 닫으면 연 자리로 포커스가 돌아간다.
 * - 재생 중 표시는 누른 줄에 고정한다. 영상이 흘러 다음 언급에 닿을 때 표시를 옮기려면 IFrame Player API 가 필요해 하지 않는다.
 */
export function VideoSheet({ video, startMs, activeMs, onPlay, onExternalLink, onClose }: VideoSheetProps) {
  return (
    <BottomSheet open={video !== undefined} onClose={onClose}>
      {video ? (
        <>
          <BottomSheetHeader title={<span className="line-clamp-2">{keepWords(video.title)}</span>} onClose={onClose} />
          <div className="flex shrink-0 flex-col gap-3 px-5 pb-2">
            {/* 시각을 바꾸면 start= 주소로 다시 불러온다. key 를 바꿔 같은 시각을 다시 눌러도 그 자리부터 다시 튼다. */}
            <iframe
              key={`${video.id}-${startMs}-${activeMs ?? "head"}`}
              title={video.title}
              src={`https://www.youtube-nocookie.com/embed/${video.id}?start=${Math.floor(startMs / 1000)}&autoplay=1`}
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
            <ul aria-label="이 영상의 언급" className="flex flex-col pb-4">
              {videoMentionLines(video).map((line) => (
                <li key={line.mention.ordinal}>
                  <SheetMentionRow
                    line={line}
                    slot={timeChipSlot(video)}
                    playing={activeMs === line.mention.startMs}
                    onPlay={() => onPlay(line)}
                  />
                </li>
              ))}
            </ul>
          </BottomSheetBody>
        </>
      ) : null}
    </BottomSheet>
  );
}

/** 시트의 언급 줄. 줄 전체가 그 시각부터 재생하는 버튼이고, hover 면은 시트 폭 끝까지 깐다(S04). */
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
      className="pressable fb-bleed flex w-full items-start gap-3 py-3 text-left select-none"
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

/** 이 영상을 YouTube 에서 여는 바깥 링크(기존 동작). 명세에는 없지만 남겨 둔다. */
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
      className="pressable fb-inline fb-inline-on-background flex min-h-11 shrink-0 items-center gap-0.5 text-caption font-semibold text-text-secondary select-none"
    >
      YouTube
      <Icon name="chevron-right" size={12} />
    </a>
  );
}
