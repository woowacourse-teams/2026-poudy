import { Screen, ScreenBody } from "@poudy/design-system/screen";
import type { ReactNode } from "react";

import { SimilarProductsTopBar } from "@/components/similar-products/SimilarProductsTopBar";

export default function SimilarProductsLayout({ children }: { readonly children: ReactNode }) {
  return (
    <Screen scroll="document">
      <SimilarProductsTopBar />
      <main className="flex flex-1 flex-col">
        <ScreenBody>
          {/* 없는 제품·화면 오류가 남은 높이의 세로 가운데에 오도록 본문이 남은 높이를 채운다(S284 · S287). */}
          <div className="flex flex-1 flex-col px-gutter pt-6">{children}</div>
        </ScreenBody>
      </main>
    </Screen>
  );
}
