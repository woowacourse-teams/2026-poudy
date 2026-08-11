import { z } from "zod";

export type WorkflowRunContext = {
  readonly pullRequest: { readonly number: number; readonly html_url: string } | undefined;
  readonly steps: { readonly completed: number; readonly total: number } | undefined;
};

const lookupTimeoutMs = 3_000;

const pullRequestListSchema = z.array(z.object({ number: z.number(), html_url: z.string() }));

const jobListSchema = z.object({
  jobs: z.array(
    z.object({
      steps: z.array(z.object({ conclusion: z.string().nullable() })).optional(),
    }),
  ),
});

// 공개 저장소는 토큰 없이도 조회된다. 토큰은 비공개 저장소와 더 높은 요청 한도를 위한 것이다.
// 조회가 실패하면 그 필드만 비운다. 알림 자체는 계속 보낸다.
async function fetchJson(url: string, token: string | undefined): Promise<unknown> {
  const response = await fetch(url, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "poudy-discord-worker",
    },
    signal: AbortSignal.timeout(lookupTimeoutMs),
  });

  if (!response.ok) {
    throw new Error(`GitHub API ${response.status}`);
  }

  return response.json();
}

// fork 에서 올린 PR 은 workflow_run 의 pull_requests 가 비어 있어 커밋으로 되짚는다.
// 이때 커밋은 fork 쪽에만 있으므로 head_repository 로 조회해야 한다.
// 워크플로가 도는 저장소로 조회하면 fork PR 은 빈 배열이 돌아온다.
async function lookupPullRequest(
  headRepositoryFullName: string,
  headSha: string,
  token: string | undefined,
): Promise<WorkflowRunContext["pullRequest"]> {
  try {
    const url = `https://api.github.com/repos/${headRepositoryFullName}/commits/${headSha}/pulls`;
    const pullRequests = pullRequestListSchema.parse(await fetchJson(url, token));

    return pullRequests[0];
  } catch {
    return undefined;
  }
}

async function lookupSteps(jobsUrl: string, token: string | undefined): Promise<WorkflowRunContext["steps"]> {
  try {
    const { jobs } = jobListSchema.parse(await fetchJson(jobsUrl, token));
    const steps = jobs.flatMap((job) => job.steps ?? []);

    if (steps.length === 0) {
      return undefined;
    }

    return {
      completed: steps.filter((step) => step.conclusion !== null).length,
      total: steps.length,
    };
  } catch {
    return undefined;
  }
}

type WorkflowRunLike = {
  readonly head_sha: string;
  readonly jobs_url?: string | undefined;
  readonly head_repository?: { readonly full_name: string } | undefined;
  readonly pull_requests?: readonly { readonly number?: number | undefined }[] | undefined;
};

// 같은 저장소에 올린 PR 은 페이로드에 번호가 들어 있다. 이때는 조회하지 않는다.
// 페이로드에는 html_url 이 없으므로 저장소 주소로 링크를 만든다.
function pullRequestFromPayload(run: WorkflowRunLike, repositoryHtmlUrl: string): WorkflowRunContext["pullRequest"] {
  const number = run.pull_requests?.[0]?.number;

  return number === undefined ? undefined : { number, html_url: `${repositoryHtmlUrl}/pull/${number}` };
}

export async function workflowRunContext(
  run: WorkflowRunLike,
  repositoryHtmlUrl: string,
  token: string | undefined,
): Promise<WorkflowRunContext> {
  const payloadPullRequest = pullRequestFromPayload(run, repositoryHtmlUrl);
  const headRepository = run.head_repository?.full_name;

  const [lookedUpPullRequest, steps] = await Promise.all([
    // fork PR 은 페이로드가 비어 있어 커밋으로 되짚어야 한다.
    payloadPullRequest ?? (headRepository ? lookupPullRequest(headRepository, run.head_sha, token) : undefined),
    run.jobs_url ? lookupSteps(run.jobs_url, token) : undefined,
  ]);

  return { pullRequest: lookedUpPullRequest, steps };
}
