import { cn } from "@poudy/design-system/cn";
import { connection } from "next/server";

import { SubTopBar } from "@/components/navigation/SubTopBar";
import { ChannelList } from "@/components/youtube/ChannelList";
import { fetchYouTubeChannelCards } from "@/lib/api/youtube";

export const metadata = { title: "유튜버" };
export default async function YouTubersPage() {
  await connection();
  const items = await fetchYouTubeChannelCards();
  return (
    <>
      <SubTopBar title="유튜버" />
      <main className={cn("flex-1 px-gutter", items.length ? "pb-inquiry" : "pb-8")}>
        {items.length ? (
          <ChannelList items={items} />
        ) : (
          <p className="py-16 text-center text-body text-text-secondary">유튜버 제품을 준비하고 있어요.</p>
        )}
      </main>
    </>
  );
}
