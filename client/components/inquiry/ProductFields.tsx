"use client";

import { FieldLabel } from "./FieldLabel";
import { FieldMessage } from "./FieldMessage";

import { Icon } from "@/components/ui/icons/Icon";
import { BRAND_NAME_MAX_LENGTH, PRODUCT_NAME_MAX_LENGTH } from "@/lib/api/feedback";
import { brandNameError, productNameError } from "@/lib/domain/inquiry-validation";
import { useFieldError } from "@/lib/hooks/useFieldError";

const inputClass =
  "w-full rounded-xl bg-surface-subtle px-3 py-3 text-[14px] text-text-primary outline-none placeholder:text-text-secondary disabled:opacity-60";

/**
 * 제품 등록 요청은 자유 입력 대신 제품명과 브랜드를 받는다.
 * 브랜드는 선택이며, 비워 두어도 제출 버튼이 켜지는 것으로 그 사실을 알린다.
 */
export function ProductFields({
  productName,
  brandName,
  onProductNameChange,
  onBrandNameChange,
  disabled = false,
}: {
  readonly productName: string;
  readonly brandName: string;
  readonly onProductNameChange: (value: string) => void;
  readonly onBrandNameChange: (value: string) => void;
  readonly disabled?: boolean;
}) {
  const productError = useFieldError(productName, productNameError);
  const brandError = useFieldError(brandName, brandNameError);

  return (
    <>
      <section className="flex flex-col gap-2">
        <FieldLabel htmlFor="inquiry-product-name" required>
          제품명
        </FieldLabel>

        <input
          id="inquiry-product-name"
          value={productName}
          onChange={(event) => onProductNameChange(event.target.value)}
          maxLength={PRODUCT_NAME_MAX_LENGTH}
          disabled={disabled}
          placeholder="등록을 원하는 제품명을 적어주세요."
          aria-invalid={productError ? true : undefined}
          aria-describedby="inquiry-product-name-message"
          className={inputClass}
        />

        {/* 잘못이 있으면 설명 자리에 잘못을 대신 보여 준다. */}
        <FieldMessage
          id="inquiry-product-name-message"
          error={productError}
          hint="용량이나 버전이 있다면 함께 적어주세요."
        />
      </section>

      <section className="flex flex-col gap-2">
        <FieldLabel htmlFor="inquiry-brand-name">브랜드</FieldLabel>

        <input
          id="inquiry-brand-name"
          value={brandName}
          onChange={(event) => onBrandNameChange(event.target.value)}
          maxLength={BRAND_NAME_MAX_LENGTH}
          disabled={disabled}
          placeholder="브랜드를 알고 있다면 적어주세요."
          aria-invalid={brandError ? true : undefined}
          aria-describedby="inquiry-brand-name-message"
          className={inputClass}
        />

        <FieldMessage id="inquiry-brand-name-message" error={brandError} />
      </section>

      <section className="flex gap-3 rounded-xl bg-surface-subtle p-3">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-soft">
          <Icon name="sparkles" size={16} className="text-brand" />
        </span>

        <span className="flex flex-col gap-1">
          <span className="text-[13px] font-semibold text-text-primary">제품 정보를 확인해주세요</span>
          <span className="text-[12px] text-text-secondary">
            보내주신 정보를 확인해 제품 목록에 반영할게요. 등록까지는 시간이 걸릴 수 있어요.
          </span>
        </span>
      </section>
    </>
  );
}
