import { Icon } from "@poudy/design-system/icon";
import type { Metadata } from "next";

import { DirectoryNotFound } from "@/components/directory/DirectoryNotFound";

export const metadata: Metadata = {
  title: "찾을 수 없는 브랜드",
};

/** S51f 없는 브랜드. 숫자가 아니거나 서버가 404 를 돌려주면 그린다. */
export default function BrandNotFound() {
  return (
    <DirectoryNotFound
      title="브랜드"
      icon={<Icon name="building-store" size={28} />}
      heading="명탐정도 못 찾은 브랜드예요"
      description={"사라졌거나 주소가 바뀐 브랜드예요.\n전체 브랜드에서 다시 찾아볼까요?"}
      action={{ href: "/brands", label: "브랜드 전체 보기" }}
    />
  );
}
