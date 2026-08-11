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
  outcomes: z.array(outcomeSchema),
});

// PR 번호로 찾는다. workflow_run 은 PR 번호를 직접 주지 않으므로 head_sha 로도 찾을 수
// 있도록 두 키를 함께 쓴다.
export function pullRequestKey(repositoryFullName: string, number: number): string {
  return `pr:${repositoryFullName}#${number}`;
}

export function commitKey(repositoryFullName: string, headSha: string): string {
  return `sha:${repositoryFullName}@${headSha}`;
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
  keys: readonly string[],
  message: PullRequestMessage,
): Promise<void> {
  if (!kv) {
    return;
  }

  try {
    const value = JSON.stringify(message);

    await Promise.all(keys.map((key) => kv.put(key, value, { expirationTtl: expirationTtlSeconds })));
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
