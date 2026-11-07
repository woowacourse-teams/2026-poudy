import { Screen, ScreenBody } from "@poudy/design-system/screen";
import type { Metadata } from "next";

import { WishlistEmpty } from "./empty";

import { SubTopBar } from "@/components/navigation/SubTopBar";
import { SavedScreen } from "@/components/saved/SavedScreen";

export const metadata: Metadata = {
  title: "위시리스트",
  description: "Poudy 위시리스트에 추가한 화장품을 한곳에서 확인해 보세요.",
  alternates: { canonical: "/my-page/wishlist" },
  openGraph: null,
  twitter: null,
};

/** 마이페이지 > 위시리스트(S55d). 하위 페이지라 하단 내비가 없다. 옛 주소 /wishlist 는 이곳으로 보낸다(next.config). */
export default function WishlistPage() {
  return (
    <Screen scroll="document" className="min-h-0 flex-1">
      <SubTopBar title="위시리스트" />
      <ScreenBody>
        <SavedScreen empty={<WishlistEmpty />} />
      </ScreenBody>
    </Screen>
  );
}
