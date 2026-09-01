import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { EmptyNotice } from "@/components/ui/EmptyNotice";
import { TopBar } from "@/components/ui/TopBar";
import { fetchShareMatch } from "@/lib/api/share";
import { shareDestinationOf } from "@/lib/domain/share-destination";

export const metadata: Metadata = {
  title: "공유한 제품 찾기",
  robots: { index: false, follow: false },
};

/** 공유 텍스트는 매번 다르므로 미리 만들어 둘 수 없다. */
export const dynamic = "force-dynamic";

/** 서버가 원문을 정제하므로 길이만 앱과 같은 기준으로 먼저 거른다. */
const MAX_TEXT_LENGTH = 500;

type SharePageProps = {
  readonly searchParams: Promise<{ readonly text?: string }>;
};

/**
 * 앱이 공유받은 텍스트를 들고 오는 경유 화면이다. 제품을 확정하면 상세로,
 * 검색어만 남으면 목록으로 곧장 보내고 이 화면에는 머무르지 않는다.
 *
 * 앱이 직접 API 를 부르던 것을 여기로 옮겼다. 그래야 앱은 웹 주소 하나만 알면 되고,
 * API 도메인이 바뀌어도 앱을 다시 빌드하지 않는다.
 */
export default async function ShareRedirectPage({ searchParams }: SharePageProps) {
  const { text } = await searchParams;
  const trimmed = text?.trim() ?? "";

  if (trimmed.length > 0 && trimmed.length <= MAX_TEXT_LENGTH) {
    // redirect 는 예외를 던져 흐름을 끊는다. try 로 감싸면 이동까지 실패로 삼킨다.
    const destination = await shareDestination(trimmed);

    if (destination) {
      redirect(destination);
    }
  }

  return (
    <>
      <TopBar title="공유한 제품 찾기" variant="sub" />
      <main className="flex-1">
        <EmptyNotice
          icon="search"
          size="screen"
          title="공유한 내용에서 제품을 찾지 못했어요"
          detail="제품 이름으로 직접 검색해 보세요."
        />
      </main>
    </>
  );
}

const shareDestination = async (text: string): Promise<string | null> => {
  try {
    return shareDestinationOf(await fetchShareMatch(text));
  } catch {
    // 서버에 닿지 못한 것과 제품이 없는 것은 사용자가 할 수 있는 일이 같다.
    return null;
  }
};
