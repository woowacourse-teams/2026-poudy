"use client";

import { Button } from "@poudy/design-system/button";
import { ErrorState } from "@poudy/design-system/error-state";
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
    <div className="pb-10">
      <ErrorState
        variant="screen"
        title="유사템을 불러오지 못했어요"
        description="잠시 후 다시 시도해 주세요."
        action={
          <Button variant="secondary" onClick={retry}>
            다시 시도
          </Button>
        }
        code={error.digest}
      />
    </div>
  );
}
