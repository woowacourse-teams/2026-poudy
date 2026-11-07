import { Suspense } from "react";

import { RoutineListScreen } from "./routine-list-screen";

/**
 * 내 루틴과 둘러보기가 함께 쓰는 화면. 머리와 탭을 레이아웃에 두어 두 탭을 오가도 다시 그려지지 않게 한다.
 * 그래서 탭 밑줄 하나가 이전 탭에서 새 탭으로 미끄러진다. 화면은 이 레이아웃이 그리고, 두 페이지는 제목만 맡는다.
 */
export default function RoutineListLayout({ children }: { readonly children: React.ReactNode }) {
  return (
    <>
      <Suspense>
        <RoutineListScreen />
      </Suspense>
      {children}
    </>
  );
}
