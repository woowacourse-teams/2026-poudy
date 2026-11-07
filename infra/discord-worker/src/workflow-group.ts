import { z } from "zod";

// PR 알림과 그 PR 에서 도는 workflow_run 은 서로 다른 웹훅 이벤트로 따로 도착한다.
// CI 결과를 PR 메시지에 채워 넣으려면 먼저 보낸 메시지의 id 를 기억해 두어야 한다.
export type WorkflowOutcome = {
  readonly name: string;
  readonly conclusion: string | null;
  readonly html_url: string;
};

export type PullRequestMessage = {
  readonly messageId: string;
  // CI 결과를 덧붙여 같은 메시지를 다시 그릴 때 필요한 값이다.
  readonly number: number;
  readonly title_line: string;
  readonly color: number;
  readonly title: string;
  readonly body: string | null;
  readonly html_url: string;
  readonly head_ref: string;
  readonly base_ref: string;
  // 새 커밋이 올라왔는지 판단해 이전 CI 결과를 버리는 데 쓴다.
  readonly head_sha: string;
  // head_sha 의 결과가 처음 도착한 워크플로의 생성 시각이다. 이보다 먼저 만들어진
  // 다른 커밋의 워크플로는 이전 커밋의 것이므로 버린다.
  readonly head_run_created_at?: string | undefined;
  readonly outcomes: readonly WorkflowOutcome[];
};

const outcomeSchema = z.object({
  name: z.string(),
  conclusion: z.string().nullable(),
  html_url: z.string(),
});

const messageSchema = z.object({
  messageId: z.string(),
  number: z.number(),
  title_line: z.string(),
  color: z.number(),
  title: z.string(),
  body: z.string().nullable(),
  html_url: z.string(),
  head_ref: z.string(),
  base_ref: z.string(),
  head_sha: z.string(),
  head_run_created_at: z.string().optional(),
  outcomes: z.array(outcomeSchema),
});

// PR 번호로 찾는다. 열린 PR 에서 도는 workflow_run 은 pull_requests 에 PR 번호를 실어 온다.
// 무료 플랜의 KV 쓰기는 하루 1,000번이라 기록은 PR 마다 하나만 둔다.
export function pullRequestKey(repositoryFullName: string, number: number): string {
  return `pr:${repositoryFullName}#${number}`;
}

// PR 이 닫힐 때 도는 워크플로는 pull_requests 가 비어 있다. 닫힐 때만 커밋으로 PR 번호를
// 찾을 수 있게 이 키에 번호를 남긴다.
export function commitKey(repositoryFullName: string, headSha: string): string {
  return `sha:${repositoryFullName}@${headSha}`;
}

export async function readCommitPullRequest(kv: KVNamespace | undefined, key: string): Promise<number | undefined> {
  if (!kv) {
    return undefined;
  }

  try {
    const number = Number(await kv.get(key));

    return Number.isInteger(number) && number > 0 ? number : undefined;
  } catch {
    return undefined;
  }
}

export async function writeCommitPullRequest(kv: KVNamespace | undefined, key: string, number: number): Promise<void> {
  if (!kv) {
    return;
  }

  try {
    await kv.put(key, String(number), { expirationTtl: expirationTtlSeconds });
  } catch {
    // 잃으면 닫힌 뒤 도는 워크플로의 결과만 메시지에 붙지 않는다.
  }
}

// PR 이 닫히면 더 볼 일이 없고, Discord 도 오래된 메시지는 수정할 수 없다.
const expirationTtlSeconds = 60 * 60 * 24 * 3;

export async function readMessage(kv: KVNamespace | undefined, key: string): Promise<PullRequestMessage | undefined> {
  if (!kv) {
    return undefined;
  }

  try {
    const raw = await kv.get(key, "json");

    return raw ? messageSchema.parse(raw) : undefined;
  } catch {
    return undefined;
  }
}

export async function writeMessage(
  kv: KVNamespace | undefined,
  key: string,
  message: PullRequestMessage,
): Promise<void> {
  if (!kv) {
    return;
  }

  try {
    await kv.put(key, JSON.stringify(message), { expirationTtl: expirationTtlSeconds });
  } catch {
    // 상태를 잃으면 CI 결과가 별도 메시지로 갈 뿐이라 알림 자체는 유지된다.
  }
}

// 같은 워크플로가 다시 끝나면 이전 결과를 대체한다. 이름 순으로 정렬해 메시지를
// 고칠 때마다 줄 순서가 흔들리지 않게 한다.
export function mergeOutcome(
  outcomes: readonly WorkflowOutcome[],
  outcome: WorkflowOutcome,
): readonly WorkflowOutcome[] {
  const others = outcomes.filter((existing) => existing.name !== outcome.name);

  return [...others, outcome].sort((left, right) => left.name.localeCompare(right.name));
}
