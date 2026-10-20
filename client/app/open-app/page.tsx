import type { Metadata } from "next";

import { OpenAppDestinationRedirect } from "@/components/navigation/OpenAppDestinationRedirect";
import { SubTopBar } from "@/components/navigation/SubTopBar";

export const metadata: Metadata = {
  title: "앱으로 이동",
  robots: { index: false, follow: false },
};

/**
 * 앱 설치 QR 코드가 담는 주소다. 머무르는 화면이 아니라 바로 다음 곳으로 넘긴다.
 *
 * 넘기는 일은 브라우저에서만 판단할 수 있어 붙은 뒤에 일어난다. 그 사이에 비거나
 * 넘기기가 막힌 경우를 위해 스토어로 가는 링크를 남긴다.
 */
export default function OpenAppPage() {
  return (
    <>
      <SubTopBar title="앱으로 이동" />

      {/* 안내 글과 링크 사이는 빈 상태의 설명과 행동 사이와 같은 16 이다(FEEDBACK F03). */}
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-gutter py-14 text-center">
        <p className="text-section font-bold text-text-primary">파우디 앱으로 이동하고 있어요</p>

        <OpenAppDestinationRedirect />
      </main>
    </>
  );
}
