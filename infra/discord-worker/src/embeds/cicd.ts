import type { WorkflowRunContext } from "../github-api.ts";
import type { DeploymentStatusPayload, WorkflowRunPayload } from "../github-event.ts";
import {
  type DiscordEmbed,
  type DiscordField,
  type EmbedState,
  embedColors,
  githubAuthor,
  repositoryFooter,
  truncateText,
} from "./shared.ts";

const resultByConclusion: Readonly<Record<string, EmbedState>> = {
  success: ["✅ CI/CD 성공", embedColors.green],
  failure: ["❌ CI/CD 실패", embedColors.red],
  cancelled: ["⏹️ CI/CD 취소", embedColors.gray],
  timed_out: ["⏱️ CI/CD 시간 초과", embedColors.red],
  skipped: ["⏭️ CI/CD 건너뜀", embedColors.gray],
};

const resultByState: Readonly<Record<string, EmbedState>> = {
  queued: ["⏳ 배포 대기 중", embedColors.yellow],
  in_progress: ["🚀 배포 진행 중", embedColors.blue],
  success: ["✅ 배포 성공", embedColors.green],
  failure: ["❌ 배포 실패", embedColors.red],
  error: ["⚠️ 배포 오류", embedColors.red],
  inactive: ["⏹️ 배포 비활성화", embedColors.gray],
};

// Wiki 알림처럼 링크를 본문 앞으로 올려, 무엇이 왜 돌았는지 한눈에 읽히게 한다.
function workflowDescription(run: WorkflowRunPayload["workflow_run"], context: WorkflowRunContext): string {
  const lines = [`**[${truncateText(run.name, 100)}](${run.html_url})**`];
  const title = run.display_title?.trim();

  if (title && title !== run.name) {
    lines.push(truncateText(title, 180));
  }

  if (context.pullRequest) {
    const { number, html_url } = context.pullRequest;
    lines.push(`[#${number} PR 보기](${html_url})`);
  }

  return lines.join("\n");
}

function workflowFields(run: WorkflowRunPayload["workflow_run"], context: WorkflowRunContext): DiscordField[] {
  const fields: DiscordField[] = [
    { name: "브랜치", value: `\`${run.head_branch}\``, inline: true },
    { name: "커밋", value: `\`${run.head_sha.slice(0, 7)}\``, inline: true },
  ];

  if (context.steps) {
    fields.push({
      name: "단계",
      value: `${context.steps.total}단계 중 ${context.steps.completed}단계 완료`,
      inline: true,
    });
  }

  const attempt = run.run_attempt > 1 ? ` · 재시도 ${run.run_attempt}회차` : "";
  fields.push({ name: "실행", value: `#${run.run_number}${attempt} · ${run.event}`, inline: true });

  return fields;
}

export function workflowRunEmbed(
  payload: WorkflowRunPayload,
  context: WorkflowRunContext = { pullRequest: undefined, steps: undefined },
): DiscordEmbed | undefined {
  if (payload.action !== "completed") {
    return undefined;
  }

  const run = payload.workflow_run;
  const result: EmbedState = resultByConclusion[run.conclusion ?? ""] ?? [
    `⚠️ CI/CD ${run.conclusion ?? "완료"}`,
    embedColors.yellow,
  ];

  return {
    title: result[0],
    url: run.html_url,
    color: result[1],
    author: githubAuthor(run.actor),
    description: workflowDescription(run, context),
    fields: workflowFields(run, context),
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
