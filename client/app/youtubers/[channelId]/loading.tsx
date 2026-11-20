import { Skeleton } from "@poudy/design-system/skeleton";

import { SubTopBar } from "@/components/navigation/SubTopBar";
import { ProductGrid } from "@/components/product/ProductGridCard";

/**
 * 유튜버 상세를 받는 동안의 자리(S297-1). 상단 내비는 실제로 그리고, 채널 정보(프로필 64 · 이름 줄 · 구독 줄),
 * 의견 막대와 수 줄, 탭 줄, 카테고리 칩, 3열 제품 칸 세 줄을 스켈레톤으로 둔다. 모양은 제품 탭(S291)이다.
 */
export default function ChannelLoading() {
  return (
    <>
      <SubTopBar title="유튜버" fallback={{ href: "/youtubers", label: "유튜버 목록으로" }} />
      <main
        aria-busy="true"
        aria-label="유튜버 정보를 불러오는 중"
        className="flex flex-1 flex-col px-gutter pb-inquiry"
      >
        <div className="flex items-center gap-4 pt-4 pb-3">
          <Skeleton shape="circle" className="size-16" />
          <span className="flex min-w-0 flex-1 flex-col gap-2">
            <Skeleton shape="line" size={20} className="w-42 max-w-full" />
            <Skeleton shape="line" size={12} className="w-30" />
          </span>
        </div>
        <div className="flex flex-col gap-2">
          <Skeleton shape="line" size={12} className="h-1.5 w-full" />
          <Skeleton shape="line" size={12} className="w-44" />
        </div>
        <div className="py-4">
          <div className="flex border-b border-border">
            {[0, 1].map((index) => (
              <span key={index} className="flex h-11 flex-1 items-center justify-center">
                <Skeleton shape="line" size={15} className="w-14" />
              </span>
            ))}
          </div>
        </div>
        <div className="flex gap-2 overflow-hidden py-1">
          <Skeleton shape="circle" className="h-8 w-21 shrink-0" />
          <Skeleton shape="circle" className="h-8 w-28 shrink-0" />
          <Skeleton shape="circle" className="h-8 w-19 shrink-0" />
          <Skeleton shape="circle" className="h-8 w-20 shrink-0" />
        </div>
        <div className="pt-2">
          <ProductGrid>
            {Array.from({ length: 9 }, (_, index) => (
              <li key={index} aria-hidden="true" className="flex flex-col gap-1">
                <Skeleton shape="box" className="aspect-square w-full" />
                <span className="flex flex-col gap-1.5 py-1">
                  <Skeleton shape="line" size={13} className="w-full" />
                  <Skeleton shape="line" size={13} className="w-2/3" />
                </span>
              </li>
            ))}
          </ProductGrid>
        </div>
      </main>
    </>
  );
}
