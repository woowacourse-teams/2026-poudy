import type { GitHubUser } from "../github-event.ts";

export type DiscordAuthor = {
  readonly name: string;
  readonly url: string | undefined;
  readonly icon_url: string | undefined;
};

export type DiscordField = {
  readonly name: string;
  readonly value: string;
  readonly inline: boolean;
};

export type DiscordFooter = {
  readonly text: string;
  readonly icon_url?: string | undefined;
};

export type DiscordEmbed = {
  readonly title: string;
  readonly url: string;
  readonly color: number;
  readonly author: DiscordAuthor;
  readonly description: string | undefined;
  readonly fields: readonly DiscordField[];
  readonly footer: DiscordFooter;
  readonly timestamp?: string | undefined;
};

export type EmbedState = readonly [title: string, color: number];

export const embedColors = {
  blue: 5793266,
  green: 5763719,
  yellow: 16705372,
  red: 15548997,
  gray: 9807270,
  purple: 10181046,
} as const;

type RepositoryCarrier = {
  readonly repository: {
    readonly full_name: string;
    readonly owner?: GitHubUser | undefined;
  };
};

export function truncateText(value: string | null | undefined, limit: number): string {
  const text = value?.trim() ?? "";

  return text.length > limit ? `${text.slice(0, limit - 3)}...` : text;
}

// Discord 는 접기를 지원하지 않는다. 본문을 그대로 넣으면 PR 템플릿을 채운 알림이
// 채널을 덮으므로, 맥락을 알 만큼만 남기고 나머지는 제목의 링크로 넘긴다.
const bodyExcerptLimit = 280;

// "## 작업 내용" 같은 머리글만 뽑히면 아무 정보가 없다. 머리글과 주석은 건너뛰고
// 실제 문장이 담긴 첫 문단을 찾는다.
function firstParagraph(body: string): string {
  for (const block of body.split(/\n\s*\n/)) {
    const lines = block.split("\n").filter((line) => line.trim().length > 0);

    // 머리글만 있는 블록, HTML 주석, 이미지·배지 줄은 건너뛴다.
    if (lines.every((line) => /^\s*(?:#{1,6}\s|<!--|!\[)/.test(line))) {
      continue;
    }

    const text = lines
      .map((line) => line.replace(/^\s*(?:#{1,6}|[-*+]|\d+\.|>)\s*/, "").trim())
      .filter((line) => line.length > 0)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    if (text) {
      return text;
    }
  }

  return "";
}

export function descriptionWithBody(title: string, body: string | null | undefined): string {
  const heading = `**${truncateText(title, 256)}**`;
  const excerpt = truncateText(firstParagraph(body?.trim() ?? ""), bodyExcerptLimit);

  return excerpt ? `${heading}\n\n${excerpt}` : heading;
}

export function githubLogin(user: GitHubUser): string {
  return user?.login ?? "삭제된 사용자";
}

export function githubAuthor(user: GitHubUser): DiscordAuthor {
  return {
    name: githubLogin(user),
    url: user?.html_url,
    icon_url: user?.avatar_url,
  };
}

export function repositoryFooter(payload: RepositoryCarrier): DiscordFooter {
  return {
    text: payload.repository.full_name,
    icon_url: payload.repository.owner?.avatar_url,
  };
}
