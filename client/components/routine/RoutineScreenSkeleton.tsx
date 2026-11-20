import { Screen, ScreenBody } from "@poudy/design-system/screen";
import { Skeleton } from "@poudy/design-system/skeleton";
import { TopBar } from "@poudy/design-system/top-bar";

/**
 * 루틴 탭이 붙기 전의 자리(S176). 둘러보기 목록이 주소의 정렬을 읽어 화면 전체가 Suspense 에 걸리는데,
 * 그동안 본문이 비면 하단 내비가 위에 그려졌다가 내려간다(#1203). 내 루틴 줄과 사진 판 카드 모양을 먼저 채운다.
 */
export function RoutineScreenSkeleton() {
  return (
    <Screen scroll="document" className="min-h-0 flex-1">
      <TopBar variant="large" title="루틴" />
      <ScreenBody>
        <main aria-busy="true" aria-label="루틴을 불러오는 중" className="flex flex-1 flex-col">
          <div className="flex flex-col gap-3 pt-2">
            <p className="px-gutter text-section font-bold text-text-primary">내 루틴</p>
            <div className="flex gap-2 px-gutter">
              <Skeleton shape="card" className="h-23 w-37" />
              <Skeleton shape="card" className="h-23 w-37" />
            </div>
          </div>
          <p className="px-gutter pt-6 text-section font-bold text-text-primary">둘러보기</p>
          <div className="flex flex-col gap-3 px-gutter pt-3 pb-inquiry">
            {[0, 1].map((index) => (
              <Skeleton key={index} shape="card" className="h-51 w-full" />
            ))}
          </div>
        </main>
      </ScreenBody>
    </Screen>
  );
}
