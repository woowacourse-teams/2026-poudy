"use client";

import { Button } from "@poudy/design-system/button";
import { Icon } from "@poudy/design-system/icon";
import { useToast } from "@poudy/design-system/toast";
import { usePressable } from "@poudy/design-system/use-pressable";
import Link from "next/link";
import { useEffect, useState } from "react";

import { OpinionTag } from "./Opinion";
import { VideoThumbnail } from "./YouTubeUI";

import { newFeatureFlow, rememberFeatureFlow } from "@/lib/analytics/feature-flow";
import { fetchProductYouTubeMentions, type YouTubeMention, type YouTubeVideo } from "@/lib/api/youtube";
import { formatDate } from "@/lib/domain/format";
import { keepWords, timestamp } from "@/lib/youtube-format";

/** 처음 보이는 영상 수. 하나 더 받아 보고, 왔으면 '영상 더 보기'를 둔다. */
const FIRST_COUNT = 4;
/** '영상 더 보기'로 한 번에 붙이는 영상 수 */
const MORE_COUNT = 10;

const TITLE_ID = "product-youtube-mentions";

type Loaded = {
  readonly videos: readonly YouTubeVideo[];
  readonly hasMore: boolean;
};

/**
 * 유튜버 상세에서 이 언급의 영상을 그 시각부터 여는 주소. 영상 탭을 이 제품으로 거르고(S294), 재생 시트를 연다.
 * video · t 의 뜻은 ChannelDetail 이 정한다.
 */
export const mentionHref = (video: YouTubeVideo, mention: YouTubeMention) =>
  `/youtubers/${encodeURIComponent(video.channelId)}?${new URLSearchParams({
    tab: "videos",
    product: String(mention.productId),
    video: video.id,
    t: String(Math.floor(mention.startMs / 1000)),
  }).toString()}`;

/**
 * 제품 상세의 '유튜버는 이렇게 썼어요'(명세 S354 ~ S357 · WERHZ). 영상 피드가 아니라 근거 목록이다.
 *
 * - 언급 하나가 한 행이다. 행 = 채널 이름과 의견 태그 / 요약 / 영상 출처(썸네일 · 제목 · 'm:ss부터 보기' · 올린 날).
 * - 영상 단위로 다섯을 받아 앞 넷의 언급을 그리고, 다섯째가 오면 '영상 더 보기'를 둔다. 누르면 다음 열 개를 붙인다.
 * - 화면 아래쪽이라 스켈레톤 없이 응답 뒤에 그린다. 비었거나 받지 못하면 제목까지 섹션을 통째로 숨긴다.
 * - 조회수 · 추천 횟수 · 사용 조건(recommendationCondition)은 그리지 않는다. 횟수보다 '어떤 피부에, 왜'가 먼저다.
 */
export function ProductYouTubeMentions({ productId }: { readonly productId: number }) {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const toast = useToast();

  useEffect(() => {
    let active = true;
    fetchProductYouTubeMentions(productId, 0, FIRST_COUNT + 1)
      .then((videos) => {
        if (active) setLoaded({ videos: videos.slice(0, FIRST_COUNT), hasMore: videos.length > FIRST_COUNT });
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [productId]);

  if (!loaded || loaded.videos.length === 0) return null;

  const loadMore = () => {
    setLoadingMore(true);
    fetchProductYouTubeMentions(productId, loaded.videos.length, MORE_COUNT + 1)
      .then((videos) => {
        setLoaded((current) =>
          current
            ? { videos: [...current.videos, ...videos.slice(0, MORE_COUNT)], hasMore: videos.length > MORE_COUNT }
            : current,
        );
      })
      .catch(() => toast.show({ message: "영상을 더 불러오지 못했어요" }))
      .finally(() => setLoadingMore(false));
  };

  return (
    <section aria-labelledby={TITLE_ID} className="flex flex-col gap-3">
      <h3 id={TITLE_ID} className="text-section leading-snug font-bold text-text-primary">
        유튜버는 이렇게 썼어요
      </h3>
      <ul className="flex flex-col">
        {loaded.videos.flatMap((video) =>
          video.mentions.map((mention) => (
            <li key={`${video.id}-${mention.ordinal}`} className="border-b border-border last:border-b-0">
              <MentionRow video={video} mention={mention} />
            </li>
          )),
        )}
      </ul>
      {loaded.hasMore ? (
        <Button
          variant="secondary"
          size="sm"
          busy={loadingMore}
          onClick={loadMore}
          trailingIcon={<Icon name="chevron-down" size={16} />}
        >
          영상 더 보기
        </Button>
      ) : null}
    </section>
  );
}

/** 언급 한 행. 행 전체가 링크이고, hover 면은 화면 폭 끝까지 깐다(STATE S04, 비슷한 제품 행과 같다). */
function MentionRow({ video, mention }: { readonly video: YouTubeVideo; readonly mention: YouTubeMention }) {
  const { pressableProps } = usePressable({ delayMs: 80 });
  return (
    <Link
      href={mentionHref(video, mention)}
      onNavigate={() => rememberFeatureFlow("youtube", video.channelId, newFeatureFlow("youtube", "product_detail"))}
      {...pressableProps}
      className="pressable fb-bleed flex flex-col gap-2 py-3 select-none"
    >
      <span className="flex items-center gap-2">
        <span className="min-w-0 truncate text-body leading-snug font-bold text-text-primary">{video.channelName}</span>
        <OpinionTag recommendation={mention.recommendation} />
      </span>
      <span className="text-body leading-relaxed text-text-primary">{keepWords(mention.summary)}</span>
      <span className="flex items-center gap-2">
        <VideoThumbnail src={video.thumbnailUrl} size="sm" />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-caption text-text-secondary">{video.title}</span>
          <span className="flex flex-wrap items-center gap-1 text-caption">
            <span className="font-semibold text-brand-text">{timestamp(mention.startMs)}부터 보기</span>
            <span className="text-text-secondary">· {formatDate(video.publishedAt)}</span>
          </span>
        </span>
      </span>
    </Link>
  );
}
