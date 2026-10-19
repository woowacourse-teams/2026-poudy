"use client";

import { Button } from "@poudy/design-system/button";
import { ErrorState } from "@poudy/design-system/error-state";
import { useEffect } from "react";

import { Icon } from "@/components/ui/icons/Icon";
import { TopBar } from "@/components/ui/TopBar";
import { reportBoundaryError } from "@/lib/analytics/report-error";
import { reloadForStaleBuild } from "@/lib/navigation/stale-build";

/**
 * 화면 하나가 무너졌을 때. 상단 바는 무너진 화면과 함께 사라져 여기서 다시 그린다.
 * 하단 내비게이션은 이 경계 바깥의 루트 레이아웃이 그대로 유지한다.
 *
 * 운영에서는 message 가 가려지고 digest 만 남는다. 서버 로그와 맞추려면 그 값이 필요해
 * 화면에도 작게 보여 준다.
 */
export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    reportBoundaryError(error, "route");
    reloadForStaleBuild(error);
  }, [error]);

  return (
    <>
      <TopBar title="문제가 생겼어요" variant="sub" />

      <main className="flex flex-1 flex-col">
        <ErrorState
          variant="screen"
          icon={<Icon name="info" size={28} />}
          title="화면을 불러오지 못했어요"
          description="잠시 후 다시 시도해 주세요. 문제가 이어지면 잠시 뒤에 다시 들러 주세요."
          action={
            <Button variant="secondary" onClick={retry}>
              다시 시도
            </Button>
          }
          code={error.digest}
          className="flex-1"
        />
      </main>
    </>
  );
}
