"use client";

import type { ExcludeCode } from "@poudy/api/api.zod";
import { Icon } from "@poudy/design-system/icon";
import { Tag } from "@poudy/design-system/tag";
import { usePressable } from "@poudy/design-system/use-pressable";
import Link from "next/link";
import { Fragment, type ReactNode } from "react";

import type { KnownExcludeCodeResponse } from "@/lib/domain/exclude-codes";

/** 예시로 보여 줄 성분 수 */
const EXAMPLES = 3;

type ExcludeCodesAboutProps = {
  readonly quickFilters: readonly KnownExcludeCodeResponse[];
  /**
   * 행마다 성분군 설명으로 가는 주소. 넘기면 행 전체가 링크가 되고 끝에 꺾쇠(›)를 둔다(탐색 조건 S22b).
   * 조건 일치 제품의 성분 시트(S23h)는 적용 전 조건을 잃지 않도록 넘기지 않고 정보만 보여 준다.
   */
  readonly hrefOf?: (code: ExcludeCode) => string;
};

/**
 * 자주 피하는 성분 설명 본문(명세 S23h · S22b). 안내 한 줄과 성분군마다 이름, 성분 수, 설명, 예시 성분 세 개를 둔다.
 * 설명과 예시는 성분군 API 응답을 그대로 쓴다.
 */
export function ExcludeCodesAbout({ quickFilters, hrefOf }: ExcludeCodesAboutProps) {
  return (
    <div className="flex flex-col gap-2 pb-4">
      <p className="text-body-sm text-text-secondary">
        피부 상태나 취향에 따라 빼고 보는 분들이 많은 성분군이에요. 누구에게나 나쁜 성분이라는 뜻은 아니에요.
      </p>
      <ul>
        {quickFilters.map((code) => (
          <li key={code.code} className="border-b border-border last:border-b-0">
            {hrefOf ? (
              <LinkRow href={hrefOf(code.code)}>
                <RowContent code={code} />
              </LinkRow>
            ) : (
              <div className="py-4">
                <RowContent code={code} />
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function LinkRow({ href, children }: { readonly href: string; readonly children: ReactNode }) {
  const { pressableProps } = usePressable();

  return (
    <Link href={href} {...pressableProps} className="pressable fb-bleed flex items-center gap-3 py-4">
      <span className="min-w-0 flex-1">{children}</span>
      <Icon name="chevron-right" size={16} scalable className="text-text-secondary" />
    </Link>
  );
}

function RowContent({ code }: { readonly code: KnownExcludeCodeResponse }) {
  return (
    <span className="flex flex-col gap-1">
      <span className="flex items-center gap-2">
        <span className="text-title font-semibold text-text-primary">{code.name}</span>
        <Tag variant="label" tone="muted">
          {`${code.ingredients.length}종`}
        </Tag>
      </span>
      <span className="text-body-sm text-text-body">{code.description}</span>
      {code.ingredients.length > 0 ? (
        <span className="text-caption text-text-muted">
          예:{" "}
          {/* 이름 안(예: 에스디알코올40-B 의 하이픈)에서 줄이 갈리지 않게 이름마다 묶는다. 줄은 이름 사이에서만 바뀐다. */}
          {code.ingredients.slice(0, EXAMPLES).map((ingredient, index) => (
            <Fragment key={ingredient.id}>
              {index > 0 ? " · " : null}
              <span className="whitespace-nowrap">{ingredient.koreanName}</span>
            </Fragment>
          ))}
        </span>
      ) : null}
    </span>
  );
}
