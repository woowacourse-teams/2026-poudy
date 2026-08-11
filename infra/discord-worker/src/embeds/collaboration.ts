import type {
  IssueCommentPayload,
  IssuePayload,
  PullRequestPayload,
  PullRequestReviewPayload,
} from "../github-event.ts";
import {
  type DiscordEmbed,
  type DiscordField,
  descriptionWithBody,
  embedColors,
  githubAuthor,
  githubLogin,
  repositoryFooter,
  truncateText,
} from "./shared.ts";

type EmbedState = readonly [title: string, color: number];

const issueStateByAction: Readonly<Record<string, EmbedState>> = {
  opened: ["🎫 새로운 이슈", embedColors.green],
  reopened: ["🔄 이슈 다시 열림", embedColors.yellow],
  closed: ["✅ 이슈 닫힘", embedColors.gray],
};

export function pullRequestEmbed(payload: PullRequestPayload): DiscordEmbed | undefined {
  const pullRequest = payload.pull_request;
  const stateByAction: Readonly<Record<string, EmbedState>> = {
    opened: ["🔀 새로운 Pull Request", embedColors.blue],
    ready_for_review: ["✅ 리뷰 준비 완료", embedColors.yellow],
  };
  const state =
    payload.action === "closed" && pullRequest.merged
      ? (["🎉 Pull Request 머지 완료", embedColors.purple] as const)
      : stateByAction[payload.action];

  if (!state || (payload.action === "opened" && pullRequest.draft)) {
    return undefined;
  }

  const fields: DiscordField[] = [
    { name: "PR", value: `#${pullRequest.number}`, inline: true },
    {
      name: "브랜치",
      value: `\`${pullRequest.head.ref}\` → \`${pullRequest.base.ref}\``,
      inline: true,
    },
  ];

  if (pullRequest.merged_by) {
    fields.push({
      name: "머지한 사람",
      value: githubLogin(pullRequest.merged_by),
      inline: true,
    });
  }

  return {
    title: state[0],
    url: pullRequest.html_url,
    color: state[1],
    author: githubAuthor(pullRequest.user),
    description: descriptionWithBody(pullRequest.title, pullRequest.body),
    fields,
    footer: repositoryFooter(payload),
    timestamp: pullRequest.updated_at,
  };
}

export function pullRequestReviewEmbed(payload: PullRequestReviewPayload): DiscordEmbed | undefined {
  if (payload.action !== "submitted" || payload.review.state !== "approved") {
    return undefined;
  }

  const pullRequest = payload.pull_request;

  return {
    title: "👍 Pull Request 승인",
    url: payload.review.html_url ?? pullRequest.html_url,
    color: embedColors.green,
    author: githubAuthor(payload.review.user),
    description: descriptionWithBody(pullRequest.title, payload.review.body),
    fields: [
      { name: "PR", value: `#${pullRequest.number}`, inline: true },
      {
        name: "PR 작성자",
        value: githubLogin(pullRequest.user),
        inline: true,
      },
      { name: "리뷰 상태", value: "승인", inline: true },
    ],
    footer: repositoryFooter(payload),
    timestamp: payload.review.submitted_at,
  };
}

export function issueEmbed(payload: IssuePayload): DiscordEmbed | undefined {
  const state = issueStateByAction[payload.action];

  if (!state) {
    return undefined;
  }

  const issue = payload.issue;
  const labels = issue.labels
    ?.map((label) => (typeof label === "string" ? label : label.name))
    .filter(Boolean)
    .join(", ");
  const assignees = issue.assignees?.map(githubLogin).join(", ");
  const fields: DiscordField[] = [
    { name: "이슈", value: `#${issue.number}`, inline: true },
    { name: "상태", value: issue.state, inline: true },
  ];

  if (labels) {
    fields.push({
      name: "라벨",
      value: truncateText(labels, 1024),
      inline: false,
    });
  }

  if (assignees) {
    fields.push({ name: "담당자", value: assignees, inline: false });
  }

  return {
    title: state[0],
    url: issue.html_url,
    color: state[1],
    author: githubAuthor(payload.sender),
    description: descriptionWithBody(issue.title, issue.body),
    fields,
    footer: repositoryFooter(payload),
    timestamp: issue.updated_at,
  };
}

export function issueCommentEmbed(payload: IssueCommentPayload): DiscordEmbed | undefined {
  if (payload.action !== "created" || payload.comment.user?.type === "Bot") {
    return undefined;
  }

  const isPullRequest = Boolean(payload.issue.pull_request);
  const target = isPullRequest ? "PR" : "이슈";

  return {
    title: `💬 ${target}에 새 댓글`,
    url: payload.comment.html_url,
    color: embedColors.blue,
    author: githubAuthor(payload.comment.user),
    description: descriptionWithBody(payload.issue.title, payload.comment.body),
    fields: [
      { name: target, value: `#${payload.issue.number}`, inline: true },
      {
        name: "댓글 작성자",
        value: githubLogin(payload.comment.user),
        inline: true,
      },
    ],
    footer: repositoryFooter(payload),
    timestamp: payload.comment.created_at,
  };
}
