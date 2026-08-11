import type { WorkflowRunContext } from "../github-api.ts";
import type { DeploymentStatusPayload, WorkflowRunPayload } from "../github-event.ts";
import type { WorkflowOutcome } from "../workflow-group.ts";
import {
  type DiscordEmbed,
  type DiscordField,
  type EmbedState,
  embedColors,
  githubAuthor,
  repositoryFooter,
  truncateText,
} from "./shared.ts";

const resultByState: Readonly<Record<string, EmbedState>> = {
  queued: ["⏳ 배포 대기 중", embedColors.yellow],
  in_progress: ["🚀 배포 진행 중", embedColors.blue],
  success: ["✅ 배포 성공", embedColors.green],
  failure: ["❌ 배포 실패", embedColors.red],
  error: ["⚠️ 배포 오류", embedColors.red],
  inactive: ["⏹️ 배포 비활성화", embedColors.gray],
};

const markByConclusion: Readonly<Record<string, string>> = {
  success: "✅",
  failure: "❌",
  cancelled: "⏹️",
  timed_out: "⏱️",
  skipped: "⏭️",
};

// 하나라도 실패하면 전체를 실패로 본다. 성공만 모였을 때만 성공이다.
function groupState(outcomes: readonly WorkflowOutcome[]): EmbedState {
  if (outcomes.some((outcome) => outcome.conclusion === "failure" || outcome.conclusion === "timed_out")) {
    return ["❌ CI/CD 실패", embedColors.red];
  }

  if (outcomes.some((outcome) => outcome.conclusion === "cancelled")) {
    return ["⏹️ CI/CD 취소", embedColors.gray];
  }

  if (outcomes.every((outcome) => outcome.conclusion === "success" || outcome.conclusion === "skipped")) {
    return ["✅ CI/CD 성공", embedColors.green];
  }

  return ["⚠️ CI/CD 완료", embedColors.yellow];
}

// Wiki 알림처럼 링크를 본문 앞으로 올려, 무엇이 왜 돌았는지 한눈에 읽히게 한다.
function workflowDescription(
  run: WorkflowRunPayload["workflow_run"],
  context: WorkflowRunContext,
  outcomes: readonly WorkflowOutcome[],
): string {
  const lines: string[] = [];
  const title = run.display_title?.trim();

  if (title) {
    lines.push(`**${truncateText(title, 180)}**`);
  }

  if (context.pullRequest) {
    const { number, html_url } = context.pullRequest;
    lines.push(`[#${number} PR 보기](${html_url})`);
  }

  if (lines.length > 0) {
    lines.push("");
  }

  for (const outcome of outcomes) {
    const mark = markByConclusion[outcome.conclusion ?? ""] ?? "⚠️";
    lines.push(`${mark} [${truncateText(outcome.name, 80)}](${outcome.html_url})`);
  }

  return truncateText(lines.join("\n"), 4096);
}

function workflowFields(run: WorkflowRunPayload["workflow_run"]): DiscordField[] {
  const attempt = run.run_attempt > 1 ? ` · 재시도 ${run.run_attempt}회차` : "";

  return [
    { name: "브랜치", value: `\`${run.head_branch}\``, inline: true },
    { name: "커밋", value: `\`${run.head_sha.slice(0, 7)}\``, inline: true },
    { name: "실행", value: `#${run.run_number}${attempt} · ${run.event}`, inline: true },
  ];
}

// 머지된 뒤 도는 워크플로를 알린다. PR 에서 도는 CI 는 PR 메시지에 붙이므로 여기 오지 않는다.
export function workflowRunEmbed(
  payload: WorkflowRunPayload,
  context: WorkflowRunContext = { pullRequest: undefined, steps: undefined },
): DiscordEmbed | undefined {
  if (payload.action !== "completed") {
    return undefined;
  }

  const run = payload.workflow_run;
  const outcomes: readonly WorkflowOutcome[] = [{ name: run.name, conclusion: run.conclusion, html_url: run.html_url }];
  const state = groupState(outcomes);

  return {
    title: state[0],
    url: context.pullRequest?.html_url ?? run.html_url,
    color: state[1],
    author: githubAuthor(run.actor),
    description: workflowDescription(run, context, outcomes),
    fields: workflowFields(run),
    footer: repositoryFooter(payload),
    timestamp: run.updated_at,
  };
}

export function deploymentStatusEmbed(payload: DeploymentStatusPayload): DiscordEmbed {
  const status = payload.deployment_status;
  const deployment = payload.deployment;
  const result: EmbedState = resultByState[status.state] ?? [`ℹ️ 배포 ${status.state}`, embedColors.blue];
  const environment = deployment.environment || deployment.ref;
  const url = status.environment_url || status.log_url || status.target_url || payload.repository.html_url;

  return {
    title: result[0],
    url,
    color: result[1],
    author: githubAuthor(payload.sender),
    description: truncateText(status.description ?? deployment.description, 900) || undefined,
    fields: [
      { name: "환경", value: environment, inline: true },
      { name: "기준", value: `\`${deployment.ref}\``, inline: true },
      {
        name: "커밋",
        value: `\`${deployment.sha.slice(0, 7)}\``,
        inline: true,
      },
    ],
    footer: repositoryFooter(payload),
    timestamp: status.updated_at,
  };
}
