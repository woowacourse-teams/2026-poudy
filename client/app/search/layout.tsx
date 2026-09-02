import { SearchTabs } from "@/components/search/SearchTabs";
import { TopBar } from "@/components/ui/TopBar";

/** S02·S03 이 함께 쓰는 껍데기. 탭으로 두 화면을 오간다. */
export default function SearchLayout({ children }: LayoutProps<"/search">) {
  return (
    <>
      <TopBar title="탐색" variant="root" />
      <SearchTabs />
      {children}
    </>
  );
}
