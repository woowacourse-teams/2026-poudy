import { EmptyState } from "@poudy/design-system/empty-state";

import { DirectoryLinkButton } from "@/components/directory/DirectoryLinkButton";

export default function NotFound() {
  return (
    <EmptyState
      title="제품이나 구성품을 찾을 수 없어요"
      description="다른 제품을 선택해 주세요."
      action={<DirectoryLinkButton href="/similar-products">제품 선택으로</DirectoryLinkButton>}
    />
  );
}
