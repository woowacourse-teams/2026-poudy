import { Screen, ScreenBody } from "@poudy/design-system/screen";
import type { ReactNode } from "react";

import { SimilarProductsTopBar } from "@/components/similar-products/SimilarProductsTopBar";

export default function SimilarProductsLayout({ children }: { readonly children: ReactNode }) {
  return (
    <Screen scroll="document">
      <SimilarProductsTopBar />
      <main className="flex flex-1 flex-col">
        <ScreenBody>
          <div className="px-gutter pt-6 pb-10">{children}</div>
        </ScreenBody>
      </main>
    </Screen>
  );
}
