"use client";

import { BottomActionBar } from "@poudy/design-system/bottom-action-bar";
import { Icon } from "@poudy/design-system/icon";
import { RadioGroup, RadioGroupItem } from "@poudy/design-system/radio-group";
import { Screen, ScreenBody } from "@poudy/design-system/screen";
import { TextField } from "@poudy/design-system/text-field";
import { TopBar } from "@poudy/design-system/top-bar";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ContentSection, contentReady } from "./ContentSection";
import { FormNotice } from "./FormNotice";
import type { InquiryChoice } from "./inquiry-type";
import { analyticsTypeOf, CONTENT_PLACEHOLDER, INQUIRY_CHOICES, INQUIRY_LABEL, PRODUCT_REQUEST } from "./inquiry-type";
import { InquiryDone } from "./InquiryDone";
import { backFromInquiry, leaveInquiry, REJECTED_MESSAGE, useSubmission } from "./use-submission";

import { track } from "@/lib/analytics/track";
import {
  BRAND_NAME_MAX_LENGTH,
  PRODUCT_NAME_MAX_LENGTH,
  requestProductRegistration,
  sendFeedback,
} from "@/lib/api/feedback";
import { brandNameRule, productNameRule } from "@/lib/domain/inquiry-validation";
import { useImageUpload } from "@/lib/hooks/useImageUpload";

type InquiryScreenProps = {
  /** 문의를 연 화면의 경로. 서버에는 path 로 보낸다. 모르면 비운다. */
  readonly originPath?: string;
};

/** 일반 문의(명세 S40 · S40a · S40b · S40g · S40c). 유형을 고르면 그 아래 입력 항목이 나타난다. */
export function InquiryScreen({ originPath }: InquiryScreenProps) {
  const router = useRouter();
  const [choice, setChoice] = useState<InquiryChoice | undefined>(undefined);
  const [content, setContent] = useState("");
  const [productName, setProductName] = useState("");
  const [brandName, setBrandName] = useState("");
  const upload = useImageUpload();
  const submission = useSubmission();

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

  const productMode = choice === PRODUCT_REQUEST;
  const ready =
    choice !== undefined &&
    (productMode
      ? productName.trim() !== "" && productNameRule.validate(productName) === undefined
      : contentReady({ content, upload }) && !upload.blocked);

  /*
   * 유형을 바꾸면 앞서 적은 것을 비운다. 오류 신고에 적던 글이 개선 제안으로 그대로 넘어가면, 유형과 맞지 않는 내용이
   * 그 유형으로 접수된다. 첨부한 사진도 앞선 문의의 것이므로 함께 비운다.
   */
  const choose = (next: string) => {
    const picked = INQUIRY_CHOICES.find((one) => one === next);
    if (!picked || picked === choice) return;
    setChoice(picked);
    setContent("");
    setProductName("");
    setBrandName("");
    upload.clear();
    submission.reset();
  };

  const edit = (setter: (value: string) => void) => (value: string) => {
    setter(value);
    submission.reset();
  };

  const submit = () => {
    if (!ready || choice === undefined) return;
    void submission.submit(
      () =>
        choice === PRODUCT_REQUEST
          ? requestProductRegistration({ productName: productName.trim(), brandName: brandName.trim() })
          : sendFeedback({ type: choice, content: content.trim(), originPath, imageIds: upload.imageIds }),
      () => {
        const imageCount = productMode ? 0 : upload.imageIds.length;
        track("inquiry_submitted", {
          inquiry_type: analyticsTypeOf(choice),
          image_count: imageCount,
          has_origin_path: originPath !== undefined,
        });
        upload.clear();
        return [
          { label: "문의 유형", value: INQUIRY_LABEL[choice] },
          ...(productMode ? [] : [{ label: "첨부 사진", value: imageCount > 0 ? `${imageCount}장` : "없음" }]),
        ];
      },
    );
  };

  const serverError = submission.rejected ? REJECTED_MESSAGE : undefined;

  return (
    <Screen scroll="body">
      <TopBar variant="sub" title="문의하기" back={{ onClick: () => backFromInquiry(router, originPath) }} />

      <ScreenBody>
        {/*
          거터와 위 20 · 아래 24 여백(LAYOUT). 항목 사이는 16 이다. 명세는 24 지만, 입력 칸마다 비워 둔 오류 문구 자리(8 + 17)가
          아래에 붙어 있어 24 를 두면 실제 틈이 49 로 벌어지고 짧은 화면에서 애매하게 스크롤이 생긴다.
        */}
        <div className="flex flex-col gap-4 px-gutter pt-5 pb-6">
          <h2 className="text-screen font-bold text-text-primary">무엇을 도와드릴까요?</h2>

          <RadioGroup
            label="문의 유형"
            variant="choice"
            size="sm"
            columns={2}
            value={choice}
            onValueChange={choose}
            disabled={submission.sending}
          >
            {INQUIRY_CHOICES.map((one) => (
              <RadioGroupItem key={one} value={one}>
                {INQUIRY_LABEL[one]}
              </RadioGroupItem>
            ))}
          </RadioGroup>

          {choice === undefined ? (
            <p className="flex items-center justify-center gap-1 text-center text-body-sm text-text-secondary">
              <Icon name="info-circle" size={16} scalable className="shrink-0" />
              문의 유형을 고르면 입력할 항목이 나타나요.
            </p>
          ) : (
            <div className="flex flex-col gap-4">
              {productMode ? (
                <>
                  <TextField
                    label="제품명"
                    value={productName}
                    onChange={edit(setProductName)}
                    maxLength={PRODUCT_NAME_MAX_LENGTH}
                    rule={productNameRule}
                    serverError={serverError}
                    disabled={submission.sending}
                    placeholder="등록을 원하는 제품명을 적어 주세요."
                    hint="용량이나 버전이 있다면 함께 적어 주세요."
                  />
                  {/* 브랜드는 적지 않아도 되는 한 줄 입력이다(명세 S40b '선택 입력'). 비우면 보내지 않는다. */}
                  <TextField
                    label="브랜드"
                    optional
                    value={brandName}
                    onChange={edit(setBrandName)}
                    maxLength={BRAND_NAME_MAX_LENGTH}
                    rule={brandNameRule}
                    disabled={submission.sending}
                    placeholder="브랜드를 알고 있다면 적어 주세요."
                  />
                  <FormNotice title="확인 후 제품 목록에 추가돼요">
                    보내 주신 정보를 확인하는 데 시간이 조금 걸릴 수 있어요.
                  </FormNotice>
                </>
              ) : (
                <ContentSection
                  // 유형을 바꾸면 칸이 기억하는 오류 상태도 처음으로 돌린다.
                  key={choice}
                  label="문의 내용"
                  placeholder={CONTENT_PLACEHOLDER[choice]}
                  value={content}
                  onChange={edit(setContent)}
                  upload={upload}
                  disabled={submission.sending}
                  serverError={serverError}
                />
              )}
            </div>
          )}
        </div>
      </ScreenBody>

      <BottomActionBar
        position="screen-end"
        // 막힌 이유는 버튼 위에 적지 않는다. 보내기에 실패했을 때만 이유를 알린다.
        notice={submission.failure ? <span role="alert">{submission.failure}</span> : undefined}
        action={{
          label: productMode ? "제품 등록 요청하기" : "문의 접수하기",
          onClick: submit,
          disabled: !ready,
          busy: submission.sending,
        }}
      />
    </Screen>
  );
}
