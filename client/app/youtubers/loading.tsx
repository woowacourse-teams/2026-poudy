import { Skeleton } from "@poudy/design-system/skeleton";

import { SubTopBar } from "@/components/navigation/SubTopBar";

/** 유튜버 목록 행 하나의 자리(S297). 프로필 48 · 이름 줄 · 구독자 줄, 오른쪽에 의견 막대와 수 두 줄이다(ChannelList). */
function ChannelSkeleton() {
  return (
    <li className="flex items-center gap-3 border-b border-border py-4">
      <Skeleton shape="circle" className="size-12" />
      <span className="flex min-w-0 flex-1 flex-col gap-2">
        <Skeleton shape="line" size={14} className="w-26" />
        <Skeleton shape="line" size={12} className="w-35 max-w-full" />
      </span>
      <span className="flex w-33 shrink-0 flex-col items-end gap-2">
        <Skeleton shape="line" size={12} className="h-1.5 w-full" />
        <Skeleton shape="line" size={12} className="w-22" />
        <Skeleton shape="line" size={12} className="w-20" />
      </span>
    </li>
  );
}

/**
 * 유튜버 목록을 받는 동안의 자리(S297). 상단 내비는 실제로 그리고, 정렬 줄과 행 여섯을 스켈레톤으로 둔다.
 * 머리와 본문 높이를 먼저 채워, 내용이 들어올 때 하단 내비가 위에서 아래로 밀려 내려가지 않게 한다(#1203).
 * 상세는 모양이 달라 [channelId]/loading.tsx 가 따로 맡는다.
 */
export default function Loading() {
  return (
    <>
      <SubTopBar title="유튜버" />
      <main aria-busy="true" aria-label="유튜버 정보를 불러오는 중" className="flex-1 px-gutter pb-inquiry">
        <div className="flex items-center justify-between gap-2 pt-4">
          <Skeleton shape="line" size={13} className="w-14" />
          <Skeleton shape="panel" className="h-9 w-33" />
        </div>
        <ul>
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <ChannelSkeleton key={index} />
          ))}
        </ul>
      </main>
    </>
  );
}
