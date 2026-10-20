import { TopBar } from "@poudy/design-system/top-bar";

import { DirectoryTabs } from "@/components/directory/DirectoryTabs";

/**
 * S27 카테고리와 S29 브랜드가 함께 쓰는 머리. 두 화면은 제목도 `카테고리` 로 같다.
 *
 * 머리와 탭을 레이아웃에 두어 두 화면을 오가도 다시 그려지지 않게 한다.
 *
 * 머리·탭·두 단 목록이 화면에서 하단 내비를 뺀 높이를 나눠 쓰고, 목록이 남은 높이를 모두 차지한다. 기기 글자를 키워
 * 목록의 최소 높이(320)까지 모자라면 이 틀이 내용만큼 늘어나 화면 전체가 스크롤된다.
 */
export default function DirectoryLayout({ children }: { readonly children: React.ReactNode }) {
  return (
    <div className="flex min-h-above-bottom-navigation flex-col">
      {/* 바로 아래 전환 탭이 선을 맡는다. 둘 다 그으면 선이 두 줄 생긴다. */}
      <TopBar variant="large" title="카테고리" edge={false} />
      <DirectoryTabs />
      {children}
    </div>
  );
}
