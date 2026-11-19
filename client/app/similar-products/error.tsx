"use client";

import { Button } from "@poudy/design-system/button";
import { ErrorState } from "@poudy/design-system/error-state";
import { Icon } from "@poudy/design-system/icon";
import { useEffect } from "react";

import { reportBoundaryError } from "@/lib/analytics/report-error";

export default function Error({
  error,
  retry,
}: {
  readonly error: Error & { digest?: string };
  readonly retry: () => void;
}) {
  useEffect(() => {
    reportBoundaryError(error, "route");
  }, [error]);
  return (
    // 화면 오류(명세 S287). 다른 화면 오류(S298 · S316 · S331)처럼 경고 아이콘을 두고 남은 높이의 세로 가운데에 둔다.
    <ErrorState
      variant="screen"
      icon={<Icon name="alert-circle" size={28} />}
      title="유사템을 불러오지 못했어요"
      description="잠시 후 다시 시도해 주세요."
      action={
        <Button variant="secondary" onClick={retry}>
          다시 시도
        </Button>
      }
      code={error.digest}
      className="flex-1"
    />
  );
}
