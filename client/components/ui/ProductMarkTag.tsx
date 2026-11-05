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
 * 다이소 로고 태그(명세 S23-2 태그 종류 견본 wP3LT). 기본은 옆에 글자가 없는 사진 위 자리의 크기인 43×16 이다.
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
 *
 * 태그 높이는 줄 높이가 아니라 옆 글자의 실제 높이에 맞춘다. Pretendard 한글의 잉크는 기준선 위 0.79em, 아래 0.085em
 * 이라 높이가 0.875em(caption 12 에서 10.5)이다. 가운데 정렬은 글꼴 지표의 반올림 때문에 1px 가까이 어긋나므로,
 * 태그의 아래 끝을 기준선에 맞춘 뒤 0.085em 내려 잉크와 위아래를 맞춘다.
 * em 으로 잡았으므로 기기 글자 크기를 키우면 태그도 글자를 따라 커진다.
 */
export function BrandWithMark({ marks, children, className }: BrandWithMarkProps) {
  return (
    <span className={cn("flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5 text-caption", className)}>
      {children}
      <ProductMarkTag marks={marks} className="h-[0.875em] translate-y-[0.085em]" />
    </span>
  );
}
