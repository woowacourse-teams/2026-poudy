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

const resultByState: Readonly<Record<string, EmbedState>> = {
  queued: ["⏳ 배포 대기 중", embedColors.yellow],
  in_progress: ["🚀 배포 진행 중", embedColors.blue],
  success: ["✅ 배포 성공", embedColors.green],
  failure: ["❌ 배포 실패", embedColors.red],
  error: ["⚠️ 배포 오류", embedColors.red],
  inactive: ["⏹️ 배포 비활성화", embedColors.gray],
};

// 머지된 뒤 도는 워크플로는 하나씩 알린다. 어떤 워크플로인지 제목에서 바로 보이게 한다.
function runState(name: string, conclusion: string | null): EmbedState {
  switch (conclusion) {
    case "success":
      return [`✅ ${name} 성공`, embedColors.green];
    case "failure":
      return [`❌ ${name} 실패`, embedColors.red];
    case "timed_out":
      return [`⏱️ ${name} 시간 초과`, embedColors.red];
    case "cancelled":
      return [`⏹️ ${name} 취소`, embedColors.gray];
    case "skipped":
      return [`⏭️ ${name} 건너뜀`, embedColors.gray];
    default:
      return [`⚠️ ${name} ${conclusion ?? "완료"}`, embedColors.yellow];
  }
}

// GitHub 이 만드는 머지 커밋은 "Merge pull request #22 from ..." 다음 빈 줄에 PR 제목을 둔다.
// 앞줄만 쓰면 어떤 작업이 배포됐는지 알 수 없어, 번호와 실제 제목을 함께 꺼낸다.
type MergedPullRequest = { readonly number: number | undefined; readonly title: string | undefined };

function mergedPullRequest(message: string | undefined): MergedPullRequest {
  if (!message?.startsWith("Merge pull request ")) {
    return { number: undefined, title: undefined };
  }

  const number = Number.parseInt(message.match(/^Merge pull request #(\d+)\b/)?.[1] ?? "", 10);
  const title = message
    .split("\n")
    .slice(1)
    .map((line) => line.trim())
    .find((line) => line.length > 0);

  return { number: Number.isFinite(number) ? number : undefined, title };
}

// 무엇이 이 실행을 유발했는지 본문 앞에 둔다. 머지면 PR 제목과 링크를,
// 직접 푸시한 커밋이면 그 커밋 제목을 쓴다.
function workflowDescription(
  run: WorkflowRunPayload["workflow_run"],
  repositoryHtmlUrl: string,
  context: WorkflowRunContext,
): string {
  const merged = mergedPullRequest(run.head_commit?.message);
  const pushedTitle = run.head_commit?.message?.split("\n")[0]?.trim();
  const title = merged.title ?? pushedTitle ?? run.display_title?.trim();
  const lines: string[] = [];

  if (title) {
    lines.push(`**${truncateText(title, 180)}**`);
  }

  const pullRequest = context.pullRequest ?? (merged.number ? { number: merged.number } : undefined);

  if (pullRequest) {
    const url = "html_url" in pullRequest ? pullRequest.html_url : `${repositoryHtmlUrl}/pull/${pullRequest.number}`;
    lines.push(`[#${pullRequest.number} PR 보기](${url})`);
  }

  return truncateText(lines.join("\n"), 4096);
}

function workflowFields(run: WorkflowRunPayload["workflow_run"], repositoryHtmlUrl: string): DiscordField[] {
  const fields: DiscordField[] = [
    { name: "브랜치", value: `\`${run.head_branch}\``, inline: true },
    {
      name: "커밋",
      value: `[\`${run.head_sha.slice(0, 7)}\`](${repositoryHtmlUrl}/commit/${run.head_sha})`,
      inline: true,
    },
  ];

  // 재시도는 드물지만 같은 커밋의 알림이 다시 왔을 때 이유를 알려 준다.
  if (run.run_attempt > 1) {
    fields.push({ name: "재시도", value: `${run.run_attempt}회차`, inline: true });
  }

  return fields;
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
  const state = runState(run.name, run.conclusion);

  return {
    title: state[0],
    // 실행 로그로 바로 갈 수 있어야 실패 원인을 확인하기 쉽다.
    url: run.html_url,
    color: state[1],
    author: githubAuthor(run.actor),
    description: workflowDescription(run, payload.repository.html_url, context),
    fields: workflowFields(run, payload.repository.html_url),
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
