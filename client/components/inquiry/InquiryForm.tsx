"use client";

import { useState } from "react";

import { ContentField } from "./ContentField";
import { ImageField } from "./ImageField";
import { ImageViewer } from "./ImageViewer";
import type { InquiryChoice } from "./inquiry-type";
import { INQUIRY_COPY, PRODUCT_REQUEST } from "./inquiry-type";
import { InquiryDone } from "./InquiryDone";
import { ProductFields } from "./ProductFields";
import { SensitiveNotice } from "./SensitiveNotice";
import { TypeField } from "./TypeField";

import { ApiError } from "@/lib/api/client";
import type { FeedbackType } from "@/lib/api/feedback";
import { CONTENT_MIN_LENGTH, requestProductRegistration, sendFeedback } from "@/lib/api/feedback";
import { useImageUpload } from "@/lib/hooks/useImageUpload";

const DONE_DESCRIPTION = "보내주신 내용을 확인해 반영할게요.";

/*
 * 문구는 한 줄에 들어가는 길이로 맞춘다. 폭이 좁아 서른 자를 넘기면 두 줄이 되는데,
 * 버튼 바로 위라 줄 수가 달라지면 버튼이 오르내려 눌리는 자리가 흔들린다.
 */
const messageOf = (error: unknown): string => {
  if (error instanceof ApiError && error.status === 429) {
    return "요청이 잦아요. 잠시 뒤 다시 시도해주세요.";
  }

  if (error instanceof ApiError && error.status === 400) {
    return "입력한 내용을 다시 확인해주세요.";
  }

  return "접수하지 못했어요. 잠시 뒤 다시 시도해주세요.";
};

type FixedType = {
  /** 유형이 정해진 채로 들어올 때 쓴다. 유형 버튼을 그리지 않는다. */
  readonly type: FeedbackType;
  readonly fieldLabel: string;
  readonly placeholder: string;
  /** 대상 제품처럼 입력 위에 두는 내용. */
  readonly header: React.ReactNode;
};

export function InquiryForm({ originPath, fixed }: { readonly originPath: string; readonly fixed?: FixedType }) {
  const [choice, setChoice] = useState<InquiryChoice | undefined>(undefined);
  const [content, setContent] = useState("");
  const [productName, setProductName] = useState("");
  const [brandName, setBrandName] = useState("");
  const [sending, setSending] = useState(false);
  const [failure, setFailure] = useState<string | undefined>(undefined);
  const [done, setDone] = useState(false);
  const [openKey, setOpenKey] = useState<string | undefined>(undefined);

  const images = useImageUpload();

  const productMode = !fixed && choice === PRODUCT_REQUEST;
  const writing = fixed !== undefined || (choice !== undefined && !productMode);

  const contentReady = content.trim().length >= CONTENT_MIN_LENGTH;
  const canSubmit = productMode
    ? productName.trim().length > 0 && !sending
    : writing && contentReady && !images.blocked && !sending;

  /*
   * 유형을 바꾸면 앞서 적은 것을 비운다. 오류 신고에 적던 글이 개선 제안으로
   * 그대로 넘어가면, 유형과 맞지 않는 내용이 그 유형으로 접수된다.
   * 첨부한 이미지도 앞선 문의의 것이므로 함께 비운다.
   */
  const chooseType = (next: InquiryChoice) => {
    if (next === choice) return;

    setChoice(next);
    setContent("");
    setProductName("");
    setBrandName("");
    setFailure(undefined);
    images.clear();
  };

  const submit = async () => {
    if (!canSubmit) return;

    setSending(true);
    setFailure(undefined);

    try {
      if (productMode) {
        await requestProductRegistration({ productName: productName.trim(), brandName });
      } else {
        await sendFeedback({
          type: fixed?.type ?? (choice as FeedbackType),
          content: content.trim(),
          originPath,
          imageIds: images.imageIds,
        });
      }

      /* 같은 요청이 두 번 가지 않도록 비운다. */
      setContent("");
      setProductName("");
      setBrandName("");
      images.clear();
      setDone(true);
    } catch (error) {
      /* 실패하면 적은 내용을 지우지 않는다. 다시 보낼 수 있어야 한다. */
      setFailure(messageOf(error));
    } finally {
      setSending(false);
    }
  };

  if (done) return <InquiryDone description={DONE_DESCRIPTION} originPath={originPath} />;

  const label = fixed?.fieldLabel ?? (choice ? INQUIRY_COPY[choice].fieldLabel : "");
  const placeholder = fixed?.placeholder ?? (choice ? INQUIRY_COPY[choice].placeholder : "");

  return (
    <>
      <div className="flex flex-1 flex-col gap-6 px-8 pt-4 pb-8">
        {fixed ? fixed.header : <h2 className="text-[20px] font-bold text-text-primary">무엇을 도와드릴까요?</h2>}

        {fixed ? null : <TypeField selected={choice} onSelect={chooseType} disabled={sending} />}

        {/* 디자인 S13 은 유형 버튼 아래 빈 자리 가운데에 안내를 둔다. */}
        {!fixed && choice === undefined ? (
          <p className="flex h-40 items-center justify-center text-center text-[13px] text-text-secondary">
            문의 유형을 선택하면 이어서 작성할 수 있어요.
          </p>
        ) : null}

        {productMode ? (
          <ProductFields
            productName={productName}
            brandName={brandName}
            onProductNameChange={setProductName}
            onBrandNameChange={setBrandName}
            disabled={sending}
          />
        ) : null}

        {writing ? (
          <>
            <ContentField
              label={label}
              placeholder={placeholder}
              value={content}
              onChange={setContent}
              disabled={sending}
            />

            <ImageField
              images={images.images}
              rejection={images.rejection}
              full={images.full}
              onAdd={images.add}
              onRemove={images.remove}
              onOpen={setOpenKey}
            />

            <SensitiveNotice />
          </>
        ) : null}
      </div>

      <div className="sticky bottom-0 bg-background px-8 pb-6 pt-3">
        {/*
          실패는 누른 버튼 바로 위에 둔다. 본문 끝에 두면 항목이 적은 화면에서
          버튼과 멀리 떨어져, 눌러 놓고도 왜 안 됐는지 눈에 들어오지 않는다.
        */}
        {failure ? (
          <p role="alert" className="pb-2 text-center text-[13px] text-brand">
            {failure}
          </p>
        ) : null}

        {/* 올리는 중이면 imageIds 가 빠진 채로 접수되므로 끝날 때까지 막는다. */}
        {images.uploading ? (
          <p className="pb-2 text-center text-[11px] text-text-secondary">이미지를 올리는 중이에요.</p>
        ) : null}

        <button
          type="button"
          onClick={submit}
          disabled={!canSubmit}
          className={`w-full rounded-xl py-4 text-[14px] font-bold transition-colors ${
            /* 켜짐과 꺼짐을 조건으로 나눈다. disabled: 변형만 두면 켜진 상태에도 꺼진 색이 남는다. */
            canSubmit ? "bg-action text-action-text" : "cursor-not-allowed bg-surface text-[#A0A2A8]"
          }`}
        >
          {productMode ? "제품 등록 요청하기" : "문의 접수하기"}
        </button>
      </div>

      {openKey ? (
        <ImageViewer
          images={images.images}
          openKey={openKey}
          onClose={() => setOpenKey(undefined)}
          onRemove={images.remove}
        />
      ) : null}
    </>
  );
}
