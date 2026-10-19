import { ErrorState } from "@poudy/design-system/error-state";
import { TopBar } from "@poudy/design-system/top-bar";
import Link from "next/link";
import type { ReactNode } from "react";

import { DirectoryLinkButton } from "./DirectoryLinkButton";

type DirectoryNotFoundProps = {
  /** 바 제목. 어느 디렉터리에서 찾지 못했는지 알린다('카테고리', '브랜드'). */
  readonly title: string;
  readonly icon: ReactNode;
  readonly heading: string;
  readonly description: string;
  readonly action: { readonly href: string; readonly label: string };
};

/**
 * 없는 카테고리(S51g)·없는 브랜드(S51f). 경로마다 not-found.tsx 가 문구만 바꿔 쓴다.
 * 일러스트 없이 아이콘 하나와 문구, 디렉터리 전체로 가는 행동 하나만 둔다(FEEDBACK F06).
 *
 * 뒤로가기는 언제나 그 디렉터리로 간다. 없는 주소에서 '이전 화면'으로 돌아가면 같은 주소를 연 화면으로 돌아갈 뿐이다.
 */
export function DirectoryNotFound({ title, icon, heading, description, action }: DirectoryNotFoundProps) {
  return (
    <>
      <TopBar variant="sub" title={title} back={{ asChild: <Link href={action.href} />, label: action.label }} />
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
