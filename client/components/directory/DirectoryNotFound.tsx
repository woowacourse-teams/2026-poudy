import { ErrorState } from "@poudy/design-system/error-state";
import type { ReactNode } from "react";

import { DirectoryLinkButton } from "./DirectoryLinkButton";

import { SubTopBar } from "@/components/navigation/SubTopBar";
import type { SubScreenFallback } from "@/components/navigation/useSubScreenBack";

type DirectoryNotFoundProps = {
  /** 바 제목. 어느 디렉터리에서 찾지 못했는지 알린다('카테고리', '브랜드'). */
  readonly title: string;
  readonly icon: ReactNode;
  readonly heading: string;
  readonly description: string;
  readonly action: { readonly href: string; readonly label: string };
  /** 사이트 안에서 온 기록이 없을 때 뒤로 가기 대신 갈 디렉터리. 정상 화면(카테고리 상품·브랜드 상세)과 같게 둔다. */
  readonly fallback: SubScreenFallback;
};

/**
 * 없는 카테고리(S51g)·없는 브랜드(S51f). 경로마다 not-found.tsx 가 문구만 바꿔 쓴다.
 * 일러스트 없이 아이콘 하나와 문구, 디렉터리 전체로 가는 행동 하나만 둔다(FEEDBACK F06).
 *
 * 뒤로 가기는 다른 하위 화면과 같이 SubTopBar(useSubScreenBack)가 맡는다. 사이트 안에서 이 주소를 열었으면 연 화면으로
 * 돌아가고, 주소로 바로 들어와 기록이 없으면 그 디렉터리(fallback)로 지금 화면을 바꿔 끼운다. 디렉터리로 가는 길은
 * 본문의 행동이 따로 맡는다.
 */
export function DirectoryNotFound({ title, icon, heading, description, action, fallback }: DirectoryNotFoundProps) {
  return (
    <>
      <SubTopBar title={title} fallback={fallback} />
      <main className="flex flex-1 flex-col">
        <ErrorState
          variant="screen"
          icon={icon}
          title={heading}
          description={description}
          action={<DirectoryLinkButton href={action.href}>{action.label}</DirectoryLinkButton>}
          className="flex-1"
        />
      </main>
    </>
  );
}
