"use client";

import { TextArea } from "@poudy/design-system/text-area";

import { PrivacyNotice } from "./FormNotice";
import { PhotoField } from "./PhotoField";

import { CONTENT_MAX_LENGTH, CONTENT_MIN_LENGTH } from "@/lib/api/feedback";
import { contentLength, contentRule } from "@/lib/domain/inquiry-validation";
import type { useImageUpload } from "@/lib/hooks/useImageUpload";

type Upload = ReturnType<typeof useImageUpload>;

/**
 * 자유 입력을 받는 묶음(명세 S40a · S40e). 내용 · 사진 · 개인정보 안내 행을 차례로 둔다.
 * 오류 신고 · 개선 제안 · 그 밖의 문의와 제품 정보 정정이 함께 쓴다.
 */
export function ContentSection({
  label,
  placeholder,
  value,
  onChange,
  upload,
  disabled,
  serverError,
}: {
  readonly label: string;
  readonly placeholder: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly upload: Upload;
  readonly disabled: boolean;
  readonly serverError?: string;
}) {
  return (
    <>
      <TextArea
        label={label}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        maxLength={CONTENT_MAX_LENGTH}
        // 보낼 때 앞뒤 공백을 지우므로 글자 수도 그 기준으로 센다(#823).
        countOf={contentLength}
        rule={contentRule}
        serverError={serverError}
        disabled={disabled}
      />
      <PhotoField upload={upload} />
      <PrivacyNotice />
    </>
  );
}

/**
 * 내용과 사진이 보낼 수 있는 상태인지. 내용이 최소 길이를 채우고, 올리는 중이거나 올리지 못한 사진이 없어야 한다.
 * 막힌 이유는 버튼 위에 따로 적지 않는다. 내용 칸의 오류와 사진 상태 줄이 그 자리에서 알린다.
 */
export const contentReady = ({ content, upload }: { readonly content: string; readonly upload: Upload }): boolean =>
  contentLength(content) >= CONTENT_MIN_LENGTH && !upload.uploading && !upload.failed;
