import type { MarkResponse } from "@poudy/api/api.zod";
import { cn } from "@poudy/design-system/cn";
import type { ReactNode } from "react";

/** 로고 태그가 있는 마크. 제품 상세 응답에는 자외선 차단 유형 같은 다른 마크도 오므로 이 코드만 그린다. */
const DAISO_CODE = "DAISO";

type ProductMarkTagProps = {
  readonly marks: readonly MarkResponse[];
  readonly className?: string;
};

/**
 * 다이소 로고 태그(명세 S23-2 태그 종류 견본 wP3LT). 높이 16 에 43×16 으로 그린다.
 * 로고가 글자를 대신하므로 대체 텍스트로 서버가 준 표시명을 읽어 준다. 다이소 마크가 없으면 자리를 차지하지 않는다.
 */
export function ProductMarkTag({ marks, className }: ProductMarkTagProps) {
  const mark = marks.find(({ code }) => code === DAISO_CODE);
  if (!mark) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/images/marks/daiso.svg"
      alt={mark.name}
      width={43}
      height={16}
      decoding="async"
      className={cn("h-4 w-auto max-w-full shrink-0 object-contain", className)}
    />
  );
}

type BrandWithMarkProps = {
  readonly marks: readonly MarkResponse[];
  /** 브랜드 이름. 긴 이름이 태그를 밀어내지 않도록 `truncate` 를 건 요소로 넘긴다. */
  readonly children: ReactNode;
  readonly className?: string;
};

/**
 * 브랜드 이름 오른쪽에 간격 8 을 두고 다이소 태그를 놓는 줄(명세 r4q5g). 사진을 가리지 않는 행에서 쓴다.
 * 큰 글자나 긴 브랜드로 한 줄에 들지 않으면 태그를 다음 줄로 내려, 태그가 브랜드 이름을 밀어내지 않게 한다.
 */
export function BrandWithMark({ marks, children, className }: BrandWithMarkProps) {
  return (
    <span className={cn("flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5", className)}>
      {children}
      <ProductMarkTag marks={marks} />
    </span>
  );
}
