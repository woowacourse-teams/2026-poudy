"use client";

import { Button } from "@poudy/design-system/button";
import { ErrorState } from "@poudy/design-system/error-state";
import { Icon } from "@poudy/design-system/icon";
import { useEffect } from "react";

import { reportBoundaryError } from "@/lib/analytics/report-error";
import { reloadForStaleBuild } from "@/lib/navigation/stale-build";

/**
 * 카테고리·브랜드 목록을 불러오지 못했을 때(FEEDBACK F06, S51). 상단 내비와 전환 탭은 레이아웃에 남아 다른 쪽으로
 * 옮겨 갈 수 있다. 하단 내비게이션도 루트 레이아웃이 그대로 유지한다.
 */
export default function DirectoryError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  // 경계가 잡은 오류를 한 번 남긴다. 렌더 중에 남기면 다시 그릴 때마다 겹쳐 남는다.
  useEffect(() => {
    reportBoundaryError(error, "route");
    reloadForStaleBuild(error);
  }, [error]);

  return (
    <ErrorState
      variant="screen"
      icon={<Icon name="alert-circle" size={28} />}
      title="목록을 불러오지 못했어요"
      description="잠시 후 다시 시도해 주세요."
      action={
        <Button variant="secondary" onClick={retry}>
          다시 시도
        </Button>
      }
      code={error.digest}
      className="grow"
    />
  );
}
