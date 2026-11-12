import { Skeleton } from "@poudy/design-system/skeleton";
import { TopBar } from "@poudy/design-system/top-bar";
import Link from "next/link";

/** 유튜버 카드 하나의 자리. 프로필(64)·이름·요약 줄과 제품 사진 세 칸이다(ChannelList). */
function ChannelSkeleton() {
  return (
    <li className="py-5">
      <div className="flex items-center gap-4">
        <Skeleton shape="circle" className="size-16" />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <Skeleton shape="line" size={18} className="w-28" />
          <Skeleton shape="line" size={12} className="w-48 max-w-full" />
        </div>
      </div>
      <div className="mt-3 grid max-w-80 grid-cols-3 gap-2 pl-20">
        {[0, 1, 2].map((index) => (
          <Skeleton key={index} shape="panel" className="aspect-square w-full" />
        ))}
      </div>
    </li>
  );
}

/**
 * 유튜버 목록을 받는 동안의 자리. 다른 탭 화면처럼 머리와 본문 높이를 먼저 채워,
 * 내용이 들어올 때 하단 내비가 위에서 아래로 밀려 내려가지 않게 한다(#1203).
 */
export default function Loading() {
  return (
    <>
      <TopBar variant="sub" title="유튜버" back={{ asChild: <Link href="/" />, label: "홈으로" }} />
      <main aria-busy="true" aria-label="유튜버 정보를 불러오는 중" className="flex-1 px-gutter pb-inquiry">
        <div className="flex flex-col gap-2 pt-5">
          <Skeleton shape="line" size={14} className="w-64 max-w-full" />
          <Skeleton shape="line" size={14} className="w-28" />
        </div>
        <div className="mt-4 flex justify-end">
          <Skeleton shape="panel" className="h-11 w-36" />
        </div>
        <ul className="divide-y divide-border">
          {[0, 1, 2].map((index) => (
            <ChannelSkeleton key={index} />
          ))}
        </ul>
      </main>
    </>
  );
}
