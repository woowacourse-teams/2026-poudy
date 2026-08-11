import type { DiscussionCommentPayload, DiscussionPayload, WikiPayload } from "../github-event.ts";
import {
  type DiscordEmbed,
  type DiscordField,
  descriptionWithBody,
  embedColors,
  githubAuthor,
  githubLogin,
  repositoryFooter,
} from "./shared.ts";

type EmbedState = readonly [title: string, color: number];

const wikiActionTextByAction: Readonly<Record<string, string>> = {
  created: "생성",
  edited: "수정",
};

export function discussionEmbed(payload: DiscussionPayload): DiscordEmbed | undefined {
  const stateByAction: Readonly<Record<string, EmbedState>> = {
    created: ["💬 새로운 Discussion", embedColors.blue],
    edited: ["✏️ Discussion 수정", embedColors.yellow],
    deleted: ["🗑️ Discussion 삭제", embedColors.gray],
  };
  const state = stateByAction[payload.action];

  if (!state) {
    return undefined;
  }

  const discussion = payload.discussion;
  const fields: DiscordField[] = [];

  if (discussion.category?.name) {
    fields.push({
      name: "카테고리",
      value: discussion.category.name,
      inline: true,
    });
  }

  fields.push({
    name: "댓글",
    value: `${discussion.comments ?? 0}개`,
    inline: true,
  });

  return {
    title: state[0],
    url: discussion.html_url,
    color: state[1],
    author: githubAuthor(discussion.user),
    description: descriptionWithBody(discussion.title, discussion.body),
    fields,
    footer: repositoryFooter(payload),
    timestamp: discussion.updated_at,
  };
}

export function discussionCommentEmbed(payload: DiscussionCommentPayload): DiscordEmbed | undefined {
  const stateByAction: Readonly<Record<string, EmbedState>> = {
    created: ["💬 Discussion에 새 댓글", embedColors.blue],
    edited: ["✏️ Discussion 댓글 수정", embedColors.yellow],
    deleted: ["🗑️ Discussion 댓글 삭제", embedColors.gray],
  };
  const state = stateByAction[payload.action];

  if (!state) {
    return undefined;
  }

  return {
    title: state[0],
    url: payload.comment.html_url,
    color: state[1],
    author: githubAuthor(payload.comment.user),
    description: descriptionWithBody(payload.discussion.title, payload.comment.body),
    fields: [
      {
        name: "Discussion 작성자",
        value: githubLogin(payload.discussion.user),
        inline: true,
      },
      {
        name: "답변 채택",
        value: payload.comment.is_answer ? "예" : "아니요",
        inline: true,
      },
    ],
    footer: repositoryFooter(payload),
    timestamp: payload.comment.updated_at,
  };
}

export function wikiEmbed(payload: WikiPayload): DiscordEmbed | undefined {
  const firstPage = payload.pages[0];

  if (!firstPage) {
    return undefined;
  }

  const visiblePages = payload.pages.slice(0, 6);
  const pageDescriptions = visiblePages.map((page) => {
    const action = wikiActionTextByAction[page.action] ?? page.action;
    const title = page.title.length > 100 ? `${page.title.slice(0, 97)}...` : page.title;
    const summary = page.summary?.trim();
    const details = [`**[${action}: ${title}](${page.html_url})**`];

    if (summary) {
      details.push(summary.length > 180 ? `${summary.slice(0, 177)}...` : summary);
    }

    details.push(`커밋 \`${page.sha.slice(0, 7)}\``);
    return details.join("\n");
  });
  const hiddenPageCount = payload.pages.length - visiblePages.length;

  if (hiddenPageCount > 0) {
    pageDescriptions.push(`그 외 ${hiddenPageCount}개 페이지`);
  }

  const description = pageDescriptions.join("\n\n");
  const repositoryName = payload.repository.full_name;

  return {
    title: "📚 Wiki 업데이트",
    url: firstPage.html_url,
    color: embedColors.blue,
    author: githubAuthor(payload.sender),
    description: description.length > 4096 ? `${description.slice(0, 4093)}...` : description,
    fields: [
      {
        name: "저장소",
        value: `[${repositoryName}](${payload.repository.html_url})`,
        inline: true,
      },
    ],
    footer: { text: `${repositoryName} Wiki` },
  };
}
