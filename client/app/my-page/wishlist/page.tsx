import type { Metadata } from "next";

import { SavedScreen } from "@/components/saved/SavedScreen";
// TODO(#729): 하위 상단 내비(TopBar)가 디자인 시스템에 들어오면 바꾼다. 지금은 client 의 옛 TopBar 를 쓴다.
import { TopBar } from "@/components/ui/TopBar";

export const metadata: Metadata = {
  title: "위시리스트",
  description: "Poudy에서 저장한 화장품을 한곳에서 확인해 보세요.",
  alternates: { canonical: "/my-page/wishlist" },
  openGraph: null,
  twitter: null,
};

/** 마이페이지 > 위시리스트(S55d). 하위 페이지라 하단 내비가 없다. 옛 주소 /wishlist 는 이곳으로 보낸다(next.config). */
export default function WishlistPage() {
  return (
    <>
      {/* 아래에 붙는 찾는 칸이 그림자를 맡는다. */}
      <TopBar title="위시리스트" variant="sub" edge={false} />
      <SavedScreen />
    </>
  );
}
