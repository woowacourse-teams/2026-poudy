import { Icon } from "@poudy/design-system/icon";
import type { Metadata } from "next";

import { DirectoryNotFound } from "@/components/directory/DirectoryNotFound";

export const metadata: Metadata = {
  title: "찾을 수 없는 카테고리",
};

/** S51g 없는 카테고리. 숫자가 아니거나 목록에 없는 id 로 들어오면 그린다. */
export default function CategoryNotFound() {
  return (
    <DirectoryNotFound
      title="카테고리"
      icon={<Icon name="grid" size={28} />}
      heading="이정표에 없는 카테고리예요"
      description={"정리됐거나 주소가 바뀐 카테고리예요.\n전체 카테고리에서 길을 다시 찾아봐요."}
      action={{ href: "/categories", label: "카테고리 전체 보기" }}
    />
  );
}
