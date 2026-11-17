import { cn } from "@poudy/design-system/cn";
import { connection } from "next/server";

import { SubTopBar } from "@/components/navigation/SubTopBar";
import { ChannelList } from "@/components/youtube/ChannelList";
import { fetchYouTubeChannelCards } from "@/lib/api/youtube";
import { dateLabel } from "@/lib/youtube-format";

export const metadata = { title: "유튜버" };
export default async function YouTubersPage() {
  await connection();
  const items = await fetchYouTubeChannelCards();
  const updated = items
    .map(({ channel }) => channel.updatedAt)
    .sort()
    .at(-1);
  return (
    <>
      <SubTopBar title="유튜버" />
      <main className={cn("flex-1 px-gutter", items.length ? "pb-inquiry" : "pb-8")}>
        <p className="pt-5 text-14 leading-relaxed text-text-secondary">
          뷰티 유튜버의 영상에 나온 제품을 모았어요.
          {updated && (
            <>
              <br />
              {dateLabel(updated)} 업데이트
            </>
          )}
        </p>
        {items.length ? (
          <ChannelList items={items} />
        ) : (
          <p className="py-16 text-center text-14 text-text-secondary">유튜버 제품을 준비하고 있어요.</p>
        )}
      </main>
    </>
  );
}
