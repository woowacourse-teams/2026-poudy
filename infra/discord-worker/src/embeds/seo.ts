import type { SeoReport, SeoScores } from "../notify.ts";
import { type DiscordEmbed, embedColors, truncateText } from "./shared.ts";

// Lighthouse 보고서가 점수를 늘어놓는 차례대로 둔다. 측정 화면과 순서가 같아야
// 두 곳을 함께 볼 때 눈이 헤매지 않는다.
const scoreLabels: readonly (readonly [keyof SeoScores, string])[] = [
  ["performance", "Performance"],
  ["accessibility", "Accessibility"],
  ["bestPractices", "Best Practices"],
  ["seo", "SEO"],
];

function mark(score: number | null): string {
  if (score === null) {
    return "⚪";
  }

  return score >= 90 ? "🟢" : score >= 50 ? "🟡" : "🔴";
}

// Discord 는 표 문법을 렌더링하지 않는다. 그래서 코드 블록에 담아 고정폭 글꼴로
// 세운다. 자릿수가 달라도 칸이 어긋나지 않도록 이름은 왼쪽으로, 점수는 오른쪽으로
// 붙여 맞춘다.
function scoreTable(scores: SeoScores): string {
  const nameWidth = Math.max(...scoreLabels.map(([, label]) => label.length));

  return scoreLabels
    .map(([key, label]) => {
      const score = scores[key];

      return `${label.padEnd(nameWidth)}  ${(score === null ? "-" : String(score)).padStart(3)}  ${mark(score)}`;
    })
    .join("\n");
}

export function seoReportEmbed(report: SeoReport): DiscordEmbed {
  const indexable = report.indexable;
  const lines = [
    `색인 허용: ${indexable ? "✅ 열려 있음" : "❌ 막혀 있음"}`,
    "",
    "```",
    scoreTable(report.scores),
    "```",
  ];

  if (report.runUrl) {
    lines.push(`[실행 기록 보기](${report.runUrl})`);
  }

  return {
    // 색인이 막힌 것은 사고이므로 제목에서 먼저 보이게 한다.
    title: indexable ? "🔍 운영 SEO 측정" : "❌ 운영 화면이 색인에서 막혔습니다",
    url: report.siteUrl,
    color: indexable ? embedColors.green : embedColors.red,
    // 사람이 아니라 워크플로가 보낸 알림이라 author 자리에 측정 대상을 둔다.
    author: { name: report.siteUrl, url: report.siteUrl, icon_url: undefined },
    description: truncateText(lines.join("\n"), 4096),
    fields: [],
    footer: { text: report.repository ?? "운영 SEO 측정" },
    // 잰 시각을 보내지 않았으면 받은 시각을 쓴다.
    timestamp: report.timestamp ?? new Date().toISOString(),
  };
}
