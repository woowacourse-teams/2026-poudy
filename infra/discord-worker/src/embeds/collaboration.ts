import type {
  IssueCommentPayload,
  IssuePayload,
  PullRequestPayload,
  PullRequestReviewPayload,
  WorkflowRunPayload,
} from "../github-event.ts";
import type { PullRequestMessage, WorkflowOutcome } from "../workflow-group.ts";
import {
  type DiscordEmbed,
  type DiscordField,
  descriptionWithBody,
  type EmbedState,
  embedColors,
  githubAuthor,
  githubLogin,
  repositoryFooter,
  truncateText,
} from "./shared.ts";

const issueStateByAction: Readonly<Record<string, EmbedState>> = {
  opened: ["🎫 새로운 이슈", embedColors.green],
  reopened: ["🔄 이슈 다시 열림", embedColors.yellow],
  closed: ["✅ 이슈 닫힘", embedColors.gray],
};

const pullRequestStateByAction: Readonly<Record<string, EmbedState>> = {
  opened: ["🔀 새로운 Pull Request", embedColors.blue],
  ready_for_review: ["✅ 리뷰 준비 완료", embedColors.yellow],
};

const mergedState: EmbedState = ["🎉 Pull Request 머지 완료", embedColors.purple];

const markByConclusion: Readonly<Record<string, string>> = {
  success: "✅",
  failure: "❌",
  cancelled: "⏹️",
  timed_out: "⏱️",
  skipped: "⏭️",
};

// PR 에서 도는 CI 는 별도 알림 대신 이 PR 메시지에 한 줄씩 덧붙인다.
function checkField(outcomes: readonly WorkflowOutcome[]): DiscordField | undefined {
  if (outcomes.length === 0) {
    return undefined;
  }

  const lines = outcomes.map((outcome) => {
    const mark = markByConclusion[outcome.conclusion ?? ""] ?? "⚠️";

    return `${mark} [${truncateText(outcome.name, 60)}](${outcome.html_url})`;
  });

  return { name: "CI", value: truncateText(lines.join("\n"), 1024), inline: false };
}

export function pullRequestEmbed(
  payload: PullRequestPayload,
  outcomes: readonly WorkflowOutcome[] = [],
): DiscordEmbed | undefined {
  const pullRequest = payload.pull_request;
  const state =
    payload.action === "closed" && pullRequest.merged ? mergedState : pullRequestStateByAction[payload.action];

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

  const checks = checkField(outcomes);

  if (checks) {
    fields.push(checks);
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

// workflow_run 만 도착했을 때는 PR 페이로드가 없다. 저장해 둔 값으로 같은 메시지를
// 다시 그려 CI 줄만 갱신한다.
export function storedPullRequestEmbed(stored: PullRequestMessage, run: WorkflowRunPayload): DiscordEmbed {
  const fields: DiscordField[] = [
    { name: "PR", value: `#${stored.number}`, inline: true },
    { name: "브랜치", value: `\`${stored.head_ref}\` → \`${stored.base_ref}\``, inline: true },
  ];
  const checks = checkField(stored.outcomes);

  if (checks) {
    fields.push(checks);
  }

  return {
    title: stored.title_line,
    url: stored.html_url,
    color: stored.color,
    author: githubAuthor(run.workflow_run.actor),
    description: descriptionWithBody(stored.title, stored.body),
    fields,
    footer: repositoryFooter(run),
    timestamp: run.workflow_run.updated_at,
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
