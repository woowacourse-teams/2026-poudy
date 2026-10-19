"use client";

import { EmptyState } from "@poudy/design-system/empty-state";
import { Icon, type IconName } from "@poudy/design-system/icon";

import { DirectoryLinkButton } from "./DirectoryLinkButton";

import { countConditions } from "@/lib/domain/filter-summary";
import { useFilterQuery } from "@/lib/hooks/useFilterQuery";

type DirectoryProductsEmptyProps = {
  /** 이 화면의 주소. 조건을 모두 지운 주소이기도 하다. */
  readonly basePath: string;
  /** 무엇의 제품이 없는지. '카테고리', '브랜드' */
  readonly noun: string;
  /** 조건이 없는데도 비었을 때 돌아갈 디렉터리 */
  readonly directory: { readonly href: string; readonly label: string };
  /** 아직 등록된 제품이 없을 때의 대표 아이콘. 없는 주소 화면과 같은 그림을 쓴다(카테고리 grid, 브랜드 building-store). */
  readonly icon: IconName;
};

/**
 * 카테고리 상품·브랜드 상세의 결과가 0개일 때(FEEDBACK F03).
 *
 * - 사용자가 건 조건이 있으면 '조건이 너무 좁음'이다. 조건을 모두 지운 이 화면으로 가는 행동을 둔다.
 * - 조건이 없는데도 비었으면 아직 등록된 제품이 없는 것이다. 다른 곳을 둘러보도록 디렉터리로 보낸다.
 *
 * 화면이 고정한 조건(카테고리·브랜드)은 주소에 없으므로 세지 않는다. 주소의 조건만 사용자가 건 것이다.
 * 칩 줄 아래 남은 자리를 모두 차지하고 그 가운데에 놓는다(명세 S51e). 조건 일치 제품의 빈 상태와 같다.
 */
export function DirectoryProductsEmpty({ basePath, noun, directory, icon }: DirectoryProductsEmptyProps) {
  const { filter } = useFilterQuery(basePath);
  const narrowed = countConditions(filter) > 0;

  if (narrowed) {
    return (
      <EmptyState
        icon={<Icon name="adjustments-horizontal" size={28} />}
        title="조건에 맞는 제품이 없어요"
        description="조건을 하나씩 빼 보세요."
        action={<DirectoryLinkButton href={basePath}>조건 모두 지우기</DirectoryLinkButton>}
        className="flex-1"
      />
    );
  }

  return (
    <EmptyState
      icon={<Icon name={icon} size={28} />}
      title={`아직 이 ${noun}에 등록된 제품이 없어요`}
      description="다른 곳에서 제품을 둘러보세요."
      action={<DirectoryLinkButton href={directory.href}>{directory.label}</DirectoryLinkButton>}
      className="flex-1"
    />
  );
}
