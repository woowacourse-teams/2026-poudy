"use client";

import { Button } from "@poudy/design-system/button";
import { ErrorState } from "@poudy/design-system/error-state";
import { Icon } from "@poudy/design-system/icon";
import { useEffect } from "react";

import { SubTopBar } from "@/components/navigation/SubTopBar";
import { reportBoundaryError } from "@/lib/analytics/report-error";
import { reloadForStaleBuild } from "@/lib/navigation/stale-build";

/**
 * 비교 정보를 불러오지 못했을 때(시안 v2 V3-e). 비교함은 기기에 있어 그대로 남는다고 알린다.
 * 상단 바는 무너진 화면과 함께 사라져 여기서 다시 그린다.
 */
export default function ComparisonError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    reportBoundaryError(error, "route");
    reloadForStaleBuild(error);
  }, [error]);

  return (
    <>
      <SubTopBar title="제품 비교하기" />

      <main className="flex flex-1 flex-col">
        <ErrorState
          variant="screen"
          icon={<Icon name="alert-circle" size={28} />}
          title="비교 정보를 불러오지 못했어요"
          description={"잠시 후 다시 시도해 주세요.\n비교함에 담은 제품은 그대로 있어요."}
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
