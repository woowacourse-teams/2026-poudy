"use client";

import { Button } from "@poudy/design-system/button";
import { ErrorState } from "@poudy/design-system/error-state";
import { Icon } from "@poudy/design-system/icon";
import { useEffect } from "react";

import { SubTopBar } from "@/components/navigation/SubTopBar";
import { reportBoundaryError } from "@/lib/analytics/report-error";
import { RETRY_LATER } from "@/lib/domain/messages";
import { reloadForStaleBuild } from "@/lib/navigation/stale-build";

/**
 * 유튜버 목록·상세를 불러오지 못했을 때(S298, FEEDBACK F06). 다른 화면 오류와 같은 형식으로 상단 내비('유튜버' · 뒤로)와
 * 가운데 오류 상태를 둔다. 하단 내비는 루트 레이아웃이 그대로 둔다. '홈으로' 링크는 뒤로 가기와 하단 내비의 홈이 같은 일을 해서 두지 않는다.
 */
export default function YouTubeError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  // 경계가 잡은 오류를 한 번 남긴다. 렌더 중에 남기면 다시 그릴 때마다 겹쳐 남는다.
  useEffect(() => {
    reportBoundaryError(error, "route");
    reloadForStaleBuild(error);
  }, [error]);

  return (
    <>
      <SubTopBar title="유튜버" />
      <ErrorState
        variant="screen"
        icon={<Icon name="alert-circle" size={28} />}
        title="유튜버를 불러오지 못했어요"
        description={RETRY_LATER}
        action={
          <Button variant="secondary" onClick={retry}>
            다시 시도
          </Button>
        }
        code={error.digest}
        className="grow"
      />
    </>
  );
}
