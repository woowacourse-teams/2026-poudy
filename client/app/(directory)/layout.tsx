import { DirectoryTabs } from "@/components/directory/DirectoryTabs";
import { TopBar } from "@/components/ui/TopBar";

/**
 * S27 카테고리와 S29 브랜드가 함께 쓰는 머리. 두 화면은 제목도 `카테고리` 로 같다.
 *
 * 머리와 탭을 레이아웃에 두어 두 화면을 오가도 다시 그려지지 않게 한다. 페이지마다 탭을 두면
 * 주소가 바뀔 때 탭이 새로 만들어져, 고른 탭으로 미끄러지던 밑줄이 중간에 끊긴다.
 */
export default function DirectoryLayout({ children }: { readonly children: React.ReactNode }) {
  return (
    <>
      <TopBar title="카테고리" variant="root" edge={false} />
      <DirectoryTabs />
      {children}
    </>
  );
}
