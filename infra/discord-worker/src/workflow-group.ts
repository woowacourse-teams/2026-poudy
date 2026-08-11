import { z } from "zod";

// GitHub 은 "이 커밋의 워크플로가 전부 끝났다"는 이벤트를 주지 않는다. workflow_run 은
// 워크플로마다 따로 도착하므로, 커밋별로 지금까지의 결과를 모아 두었다가 메시지 하나를
// 계속 고쳐 나간다.
export type WorkflowOutcome = {
  readonly name: string;
  readonly conclusion: string | null;
  readonly html_url: string;
};

export type WorkflowGroup = {
  readonly messageId: string | undefined;
  readonly outcomes: readonly WorkflowOutcome[];
};

const groupSchema = z.object({
  messageId: z.string().optional(),
  outcomes: z.array(
    z.object({
      name: z.string(),
      conclusion: z.string().nullable(),
      html_url: z.string(),
    }),
  ),
});

// 같은 커밋이라도 재시도하면 워크플로가 다시 돈다. 이전 시도의 결과와 섞이지 않도록
// 시도 회차까지 키에 넣는다.
export function groupKey(headSha: string, runAttempt: number): string {
  return `run:${headSha}:${runAttempt}`;
}

// PR 이 끝나면 더 볼 일이 없다. Discord 도 오래된 메시지는 수정할 수 없으므로 짧게 둔다.
const expirationTtlSeconds = 60 * 60 * 6;

export async function readGroup(kv: KVNamespace | undefined, key: string): Promise<WorkflowGroup | undefined> {
  if (!kv) {
    return undefined;
  }

  try {
    const raw = await kv.get(key, "json");

    if (!raw) {
      return undefined;
    }

    const parsed = groupSchema.parse(raw);

    return { messageId: parsed.messageId, outcomes: parsed.outcomes };
  } catch {
    return undefined;
  }
}

export async function writeGroup(kv: KVNamespace | undefined, key: string, group: WorkflowGroup): Promise<void> {
  if (!kv) {
    return;
  }

  try {
    await kv.put(key, JSON.stringify(group), { expirationTtl: expirationTtlSeconds });
  } catch {
    // 상태를 잃으면 다음 워크플로가 새 메시지를 보낼 뿐이라 알림 자체는 유지된다.
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
