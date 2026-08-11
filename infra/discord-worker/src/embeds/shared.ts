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

export function truncateText(
  value: string | null | undefined,
  limit: number,
): string {
  const text = value?.trim() ?? "";

  return text.length > limit ? `${text.slice(0, limit - 3)}...` : text;
}

export function descriptionWithBody(
  title: string,
  body: string | null | undefined,
): string {
  const heading = `**${truncateText(title, 256)}**`;
  const excerpt = truncateText(body, 900);

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
