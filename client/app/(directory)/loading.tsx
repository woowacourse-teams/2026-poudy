import { DirectorySkeleton } from "@/components/directory/DirectorySkeleton";

/** 미리 받지 못한 채 카테고리·브랜드 탭을 옮길 때. 상단 내비와 탭은 레이아웃에 남는다. */
export default function DirectoryLoading() {
  return <DirectorySkeleton />;
}
