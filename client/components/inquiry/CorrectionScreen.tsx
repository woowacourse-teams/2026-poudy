"use client";

import { BottomActionBar } from "@poudy/design-system/bottom-action-bar";
import { Screen, ScreenBody } from "@poudy/design-system/screen";
import { TopBar } from "@poudy/design-system/top-bar";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ContentSection, contentReady } from "./ContentSection";
import { CORRECTION_COPY } from "./inquiry-type";
import { InquiryDone } from "./InquiryDone";
import { TargetProduct } from "./TargetProduct";
import { backFromInquiry, leaveInquiry, REJECTED_MESSAGE, useSubmission } from "./use-submission";

import { track } from "@/lib/analytics/track";
import { requestProductCorrection } from "@/lib/api/feedback";
import { useImageUpload } from "@/lib/hooks/useImageUpload";

type CorrectionScreenProps = {
  readonly productId: number;
  readonly brandName: string;
  readonly productName: string;
  readonly imageUrl: string;
};

/**
 * 제품 정보 정정(명세 S40e). 대상 제품이 경로로 정해져 들어오므로 유형 버튼을 그리지 않는다.
 * 다른 유형으로 바꿀 수 있게 열어 두면 정정하러 온 사용자가 엉뚱한 유형으로 접수하게 된다.
 */
export function CorrectionScreen({ productId, brandName, productName, imageUrl }: CorrectionScreenProps) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const upload = useImageUpload();
  const submission = useSubmission();
  const originPath = `/products/${productId}`;

  if (submission.summary) {
    return (
      <Screen scroll="body">
        <TopBar
          variant="sub"
          title="문의하기"
          back={{ label: "닫기", onClick: () => leaveInquiry(router, originPath) }}
        />
        <InquiryDone summary={submission.summary} onConfirm={() => leaveInquiry(router, originPath)} />
      </Screen>
    );
  }

  const ready = contentReady({ content, upload }) && !upload.blocked;

  const submit = () => {
    if (!ready) return;
    void submission.submit(
      () => requestProductCorrection({ productId, content: content.trim(), imageIds: upload.imageIds }),
      () => {
        const imageCount = upload.imageIds.length;
        track("inquiry_submitted", {
          inquiry_type: "product_correction",
          image_count: imageCount,
          has_origin_path: true,
          product_id: productId,
        });
        upload.clear();
        return [
          { label: "문의 유형", value: CORRECTION_COPY.summary },
          { label: "첨부 사진", value: imageCount > 0 ? `${imageCount}장` : "없음" },
        ];
      },
    );
  };

  return (
    <Screen scroll="body">
      <TopBar variant="sub" title="문의하기" back={{ onClick: () => backFromInquiry(router, originPath) }} />

      <ScreenBody>
        {/*
          거터와 위 20 · 아래 24 여백(LAYOUT). 제목처럼 오류 문구 자리가 없는 항목 아래는 24 를 둔다.
          입력 칸은 아래에 오류 문구 자리(8 + 17)를 늘 비워 두므로, 입력 칸끼리는 8 만 둔다. 문구가 들어가도 다음 제목과 붙지 않는다.
          24 를 더 두면 실제 틈이 49 로 벌어지고 짧은 화면에서 애매하게 스크롤이 생긴다.
        */}
        <div className="flex flex-col gap-6 px-gutter pt-5 pb-6">
          <h2 className="text-screen font-bold text-text-primary">{CORRECTION_COPY.title}</h2>
          <TargetProduct brandName={brandName} productName={productName} imageUrl={imageUrl} />
          <div className="flex flex-col gap-2">
            <ContentSection
              label={CORRECTION_COPY.label}
              placeholder={CORRECTION_COPY.placeholder}
              value={content}
              onChange={(value) => {
                setContent(value);
                submission.reset();
              }}
              upload={upload}
              disabled={submission.sending}
              serverError={submission.rejected ? REJECTED_MESSAGE : undefined}
            />
          </div>
        </div>
      </ScreenBody>

      <BottomActionBar
        position="screen-end"
        // 막힌 이유는 버튼 위에 적지 않는다. 보내기에 실패했을 때만 이유를 알린다.
        notice={submission.failure ? <span role="alert">{submission.failure}</span> : undefined}
        action={{ label: "문의 접수하기", onClick: submit, disabled: !ready, busy: submission.sending }}
      />
    </Screen>
  );
}
