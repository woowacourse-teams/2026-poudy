import type {
  DeploymentStatusPayload,
  WorkflowRunPayload,
} from "../github-event.ts";
import {
  type DiscordEmbed,
  embedColors,
  githubAuthor,
  repositoryFooter,
  truncateText,
} from "./shared.ts";

type EmbedState = readonly [title: string, color: number];

export function workflowRunEmbed(
  payload: WorkflowRunPayload,
): DiscordEmbed | undefined {
  if (payload.action !== "completed") {
    return undefined;
  }

  const run = payload.workflow_run;
  const resultByConclusion: Readonly<Record<string, EmbedState>> = {
    success: ["✅ CI/CD 성공", embedColors.green],
    failure: ["❌ CI/CD 실패", embedColors.red],
    cancelled: ["⏹️ CI/CD 취소", embedColors.gray],
    timed_out: ["⏱️ CI/CD 시간 초과", embedColors.red],
    skipped: ["⏭️ CI/CD 건너뜀", embedColors.gray],
  };
  const result: EmbedState = resultByConclusion[run.conclusion ?? ""] ?? [
    `⚠️ CI/CD ${run.conclusion ?? "완료"}`,
    embedColors.yellow,
  ];

  return {
    title: result[0],
    url: run.html_url,
    color: result[1],
    author: githubAuthor(run.actor),
    description: `**${truncateText(run.name, 256)}**`,
    fields: [
      { name: "브랜치", value: `\`${run.head_branch}\``, inline: true },
      { name: "이벤트", value: run.event, inline: true },
      {
        name: "실행",
        value: `#${run.run_number} · 시도 ${run.run_attempt}`,
        inline: true,
      },
      {
        name: "커밋",
        value: `\`${run.head_sha.slice(0, 7)}\``,
        inline: true,
      },
    ],
    footer: repositoryFooter(payload),
    timestamp: run.updated_at,
  };
}

export function deploymentStatusEmbed(
  payload: DeploymentStatusPayload,
): DiscordEmbed {
  const status = payload.deployment_status;
  const deployment = payload.deployment;
  const resultByState: Readonly<Record<string, EmbedState>> = {
    queued: ["⏳ 배포 대기 중", embedColors.yellow],
    in_progress: ["🚀 배포 진행 중", embedColors.blue],
    success: ["✅ 배포 성공", embedColors.green],
    failure: ["❌ 배포 실패", embedColors.red],
    error: ["⚠️ 배포 오류", embedColors.red],
    inactive: ["⏹️ 배포 비활성화", embedColors.gray],
  };
  const result: EmbedState = resultByState[status.state] ?? [
    `ℹ️ 배포 ${status.state}`,
    embedColors.blue,
  ];
  const environment = deployment.environment || deployment.ref;
  const url =
    status.environment_url ||
    status.log_url ||
    status.target_url ||
    payload.repository.html_url;

  return {
    title: result[0],
    url,
    color: result[1],
    author: githubAuthor(payload.sender),
    description:
      truncateText(status.description ?? deployment.description, 900) ||
      undefined,
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
