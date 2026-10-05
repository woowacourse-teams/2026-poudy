import type { Metadata } from "next";

import { AppEntryRedirect } from "@/components/navigation/AppEntryRedirect";
import { TopBar } from "@/components/ui/TopBar";
import { APP_STORE_URL } from "@/lib/navigation/open-app";

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
export default function AppEntryPage() {
  return (
    <>
      <TopBar title="앱으로 이동" variant="sub" />

      <main className="flex flex-1 flex-col items-center justify-center gap-2 px-4 py-14">
        <p className="text-[15px] font-bold text-text-primary">파우디 앱으로 이동하고 있어요</p>

        <a
          href={APP_STORE_URL}
          className="mt-2 flex h-11 items-center rounded-button border border-border px-5 text-[14px] font-bold text-text-primary"
        >
          Play 스토어에서 받기
        </a>
      </main>

      <AppEntryRedirect />
    </>
  );
}
