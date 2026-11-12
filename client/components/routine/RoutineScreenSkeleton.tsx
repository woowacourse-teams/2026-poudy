import { Screen, ScreenBody } from "@poudy/design-system/screen";
import { Skeleton } from "@poudy/design-system/skeleton";
import { TopBar } from "@poudy/design-system/top-bar";

/**
 * 루틴 목록 화면이 붙기 전의 자리. 둘러보기 목록이 주소의 검색어를 읽어 화면 전체가 Suspense 에 걸리는데,
 * 그동안 본문이 비면 하단 내비가 위에 그려졌다가 내려간다(#1203). 다른 탭 화면처럼 머리와 본문 높이를 먼저 채운다.
 */
export function RoutineScreenSkeleton() {
  return (
    <Screen scroll="document" className="min-h-0 flex-1">
      <TopBar variant="large" title="루틴" edge={false} />
      <ScreenBody>
        <main aria-busy="true" aria-label="루틴을 불러오는 중" className="flex flex-1 flex-col">
          <div className="flex h-11 items-center gap-6 px-gutter">
            <Skeleton shape="line" size={15} className="w-12" />
            <Skeleton shape="line" size={15} className="w-14" />
          </div>
          <div className="routine-tab-runway flex flex-col gap-3 px-gutter pt-4 pb-inquiry">
            {[0, 1, 2].map((index) => (
              <Skeleton key={index} shape="card" className="h-28 w-full" />
            ))}
          </div>
        </main>
      </ScreenBody>
    </Screen>
  );
}
