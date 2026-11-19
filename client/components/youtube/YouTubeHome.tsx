import { YouTubeHomeSection } from "./ChannelCards";

import { allYouTubePages, fetchRecentMentions, fetchYouTubeChannels } from "@/lib/api/youtube";

/**
 * 홈 유튜버 섹션의 데이터를 서버에서 받는다. 홈은 이 섹션을 Suspense 로 감싸, 유튜버 응답을 기다리는 동안
 * 다른 섹션을 먼저 보이고 이 자리에는 스켈레톤(S288-1)을 둔다.
 *
 * - 줄에는 언급한 제품이 있는 채널만 관리자 순서대로 세운다. 최근 언급이 없는 사람을 고르면 빈 목록만 보이기 때문이다.
 * - 채널 응답이 실패하거나 세울 채널이 없으면 섹션과 아래 띠를 함께 그리지 않는다.
 * - 첫 유튜버의 언급만 미리 받는다. 받지 못하면 섹션 자리에 오류와 [다시 시도]를 둔다.
 */
export async function YouTubeHome() {
  const channels = await allYouTubePages(fetchYouTubeChannels).catch(() => []);
  const shown = channels.filter((channel) => channel.productCount > 0);
  if (shown.length === 0) return null;

  const initialMentions = await fetchRecentMentions(shown[0].id).catch(() => null);
  return <YouTubeHomeSection channels={shown} initialMentions={initialMentions} />;
}
