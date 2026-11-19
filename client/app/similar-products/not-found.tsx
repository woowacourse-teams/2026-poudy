import { ErrorState } from "@poudy/design-system/error-state";
import { Icon } from "@poudy/design-system/icon";

import { DirectoryLinkButton } from "@/components/directory/DirectoryLinkButton";

/** 없는 제품·구성품(명세 S284). 다른 없는 주소(S333)처럼 검색 아이콘 · 제목 · 행동 하나를 남은 높이의 세로 가운데에 둔다. */
export default function NotFound() {
  return (
    <ErrorState
      variant="screen"
      icon={<Icon name="search" size={28} />}
      title="제품이나 구성품을 찾을 수 없어요"
      action={<DirectoryLinkButton href="/similar-products">제품 선택으로</DirectoryLinkButton>}
      className="flex-1"
    />
  );
}
