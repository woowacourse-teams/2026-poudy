import assert from "node:assert/strict";
import test from "node:test";

import { workflowRunContext } from "../src/github-api.ts";
import worker from "../src/index.ts";
import type { DiscordBody } from "./helpers.ts";
import { env, parseRequestBody, repository, signedRequest, user } from "./helpers.ts";

const workflowRun = {
  event: "pull_request",
  conclusion: "success",
  name: "Server CI",
  display_title: "feat : Discord 알림 개선",
  head_branch: "feat/discord-worker",
  head_sha: "abcdef1234567890",
  run_number: 27,
  run_attempt: 1,
  actor: user("inaemin"),
  html_url: "https://github.test/actions/runs/1",
  jobs_url: "https://api.github.test/runs/1/jobs",
  head_repository: { full_name: "inaemin/2026-poudy" },
  updated_at: "2026-08-11T00:00:00Z",
  pull_requests: [],
};

const payload = { action: "completed", workflow_run: workflowRun, repository };

async function sendWorkflowRun(overrides: Record<string, unknown> = {}): Promise<DiscordBody> {
  let sent: DiscordBody | undefined;
  const realFetch = globalThis.fetch;

  globalThis.fetch = async (input, init) => {
    const url = input.toString();

    if (url.startsWith("https://api.github.test")) {
      return new Response(JSON.stringify({ jobs: [{ steps: [{ conclusion: "success" }] }] }), { status: 200 });
    }
    if (url.includes("/commits/")) {
      return new Response(JSON.stringify([{ number: 15, html_url: "https://github.test/pull/15" }]), { status: 200 });
    }

    sent = parseRequestBody(init);
    return new Response(null, { status: 204 });
  };

  const response = await worker.fetch(
    signedRequest("workflow_run", { ...payload, workflow_run: { ...workflowRun, ...overrides } }),
    { ...env, GITHUB_API_TOKEN: "test-token" },
  );
  globalThis.fetch = realFetch;

  assert.equal(response.status, 200);
  assert.ok(sent);
  return sent;
}

test("lists the finished workflows with the PR link", async () => {
  const body = await sendWorkflowRun();
  const embed = body.embeds[0];
  assert.ok(embed);

  assert.match(embed.description ?? "", /feat : Discord 알림 개선/);
  assert.match(embed.description ?? "", /\[#15 PR 보기\]\(https:\/\/github\.test\/pull\/15\)/);
  // 끝난 워크플로가 결과 표시와 함께 한 줄씩 쌓인다.
  assert.match(embed.description ?? "", /✅ \[Server CI\]\(https:\/\/github\.test\/actions\/runs\/1\)/);

  const fields = embed.fields ?? [];
  assert.deepEqual(
    fields.map((field) => field.name),
    ["브랜치", "커밋", "워크플로", "이벤트"],
  );
  assert.equal(fields[2]?.value, "1개 중 1개 완료");
  // 첫 시도에는 재시도 회차를 붙이지 않는다.
  assert.equal(fields[3]?.value, "pull_request");
});

test("marks the attempt number only when the run was retried", async () => {
  const body = await sendWorkflowRun({ run_attempt: 3 });
  const fields = body.embeds[0]?.fields ?? [];

  assert.equal(fields.at(-1)?.value, "pull_request · 재시도 3회차");
});

// 커밋 하나에 워크플로가 여러 개 도착하는 상황을 재현한다.
function fakeKv() {
  const store = new Map<string, string>();

  return {
    kv: {
      get: async (key: string) => {
        const raw = store.get(key);
        return raw ? JSON.parse(raw) : null;
      },
      put: async (key: string, value: string) => {
        store.set(key, value);
      },
    },
    store,
  };
}

test("collects several workflows of one commit into a single message", async () => {
  const { kv } = fakeKv();
  const requests: { method: string; url: string; body: DiscordBody }[] = [];
  const realFetch = globalThis.fetch;

  globalThis.fetch = async (input, init) => {
    const url = input.toString();

    if (url.startsWith("https://api.github")) {
      return new Response(JSON.stringify([]), { status: 200 });
    }

    requests.push({ method: init?.method ?? "GET", url, body: parseRequestBody(init) });
    return new Response(JSON.stringify({ id: "msg-1" }), { status: 200 });
  };

  const workerEnv = { ...env, WORKFLOW_RUNS: kv } as unknown as Parameters<typeof worker.fetch>[1];
  const send = (name: string, conclusion: string) =>
    worker.fetch(
      signedRequest("workflow_run", {
        ...payload,
        workflow_run: { ...workflowRun, name, conclusion, html_url: `https://github.test/runs/${name}` },
      }),
      workerEnv,
    );

  assert.equal((await send("Server CI", "success")).status, 200);
  assert.equal((await send("Client CI", "failure")).status, 200);
  globalThis.fetch = realFetch;

  // 첫 워크플로는 새 메시지, 두 번째는 같은 메시지 수정이어야 한다.
  assert.equal(requests.length, 2);
  assert.equal(requests[0]?.method, "POST");
  assert.equal(requests[1]?.method, "PATCH");
  assert.match(requests[1]?.url ?? "", /\/messages\/msg-1/);

  // 수정된 메시지에는 두 워크플로가 모두 담긴다.
  const merged = requests[1]?.body.embeds[0];
  assert.ok(merged);
  assert.match(merged.description ?? "", /Client CI/);
  assert.match(merged.description ?? "", /Server CI/);
  // 하나라도 실패하면 전체를 실패로 본다.
  assert.match(merged.title, /실패/);
  assert.equal(merged.fields?.[2]?.value, "2개 중 2개 완료");
});

test("starts a new message when editing the stored one fails", async () => {
  const { kv } = fakeKv();
  await kv.put("run:abcdef1234567890:1", JSON.stringify({ messageId: "gone", outcomes: [] }));

  const methods: string[] = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const url = input.toString();

    if (url.startsWith("https://api.github")) {
      return new Response(JSON.stringify([]), { status: 200 });
    }

    methods.push(init?.method ?? "GET");
    // 지워진 메시지를 수정하려 하면 실패한다.
    if (init?.method === "PATCH") {
      return new Response("not found", { status: 404 });
    }
    return new Response(JSON.stringify({ id: "msg-2" }), { status: 200 });
  };

  const response = await worker.fetch(signedRequest("workflow_run", payload), {
    ...env,
    WORKFLOW_RUNS: kv,
  } as unknown as Parameters<typeof worker.fetch>[1]);
  globalThis.fetch = realFetch;

  assert.equal(response.status, 200);
  assert.deepEqual(methods, ["PATCH", "POST"]);
});

test("keeps sending one message per workflow without KV", async () => {
  const methods: string[] = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    if (input.toString().startsWith("https://api.github")) {
      return new Response(JSON.stringify([]), { status: 200 });
    }
    methods.push(init?.method ?? "GET");
    return new Response(JSON.stringify({ id: "msg-3" }), { status: 200 });
  };

  // KV 바인딩이 없어도 알림 자체는 계속 나간다.
  assert.equal((await worker.fetch(signedRequest("workflow_run", payload), env)).status, 200);
  assert.equal((await worker.fetch(signedRequest("workflow_run", payload), env)).status, 200);
  globalThis.fetch = realFetch;

  assert.deepEqual(methods, ["POST", "POST"]);
});

test("keeps the notification when the GitHub lookup fails", async () => {
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    if (input.toString().startsWith("https://api.github")) {
      return new Response("forbidden", { status: 403 });
    }
    return new Response(null, { status: 204 });
  };

  const context = await workflowRunContext(workflowRun, repository.html_url, "test-token");
  globalThis.fetch = realFetch;

  // 조회에 실패해도 그 필드만 비우고 알림은 계속 보낸다.
  assert.equal(context.pullRequest, undefined);
  assert.equal(context.steps, undefined);
});

test("looks up public repository data without a token", async () => {
  let authorizationSent: string | null = null;
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    authorizationSent = new Headers(init?.headers).get("Authorization");

    if (input.toString().includes("/commits/")) {
      return new Response(JSON.stringify([{ number: 15, html_url: "https://github.test/pull/15" }]), { status: 200 });
    }
    return new Response(JSON.stringify({ jobs: [{ steps: [{ conclusion: "success" }] }] }), { status: 200 });
  };

  const context = await workflowRunContext(workflowRun, repository.html_url, undefined);
  globalThis.fetch = realFetch;

  // 공개 저장소는 인증 없이도 조회되므로 Authorization 헤더를 붙이지 않는다.
  assert.equal(authorizationSent, null);
  assert.equal(context.pullRequest?.number, 15);
  assert.deepEqual(context.steps, { completed: 1, total: 1 });
});

test("sends the token when one is configured", async () => {
  let authorizationSent: string | null = null;
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (_input, init) => {
    authorizationSent = new Headers(init?.headers).get("Authorization");
    return new Response(JSON.stringify([]), { status: 200 });
  };

  await workflowRunContext(workflowRun, repository.html_url, "test-token");
  globalThis.fetch = realFetch;

  assert.equal(authorizationSent, "Bearer test-token");
});

test("uses the payload PR without looking it up for same-repo runs", async () => {
  const requested: string[] = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    requested.push(input.toString());
    return new Response(JSON.stringify({ jobs: [] }), { status: 200 });
  };

  // 같은 저장소에 올린 PR 은 페이로드에 번호가 들어 있어 PR 조회를 하지 않는다.
  const context = await workflowRunContext(
    { ...workflowRun, pull_requests: [{ number: 15 }] },
    repository.html_url,
    undefined,
  );
  globalThis.fetch = realFetch;

  assert.equal(
    requested.some((url) => url.includes("/commits/")),
    false,
  );
  assert.deepEqual(context.pullRequest, {
    number: 15,
    html_url: `${repository.html_url}/pull/15`,
  });
});
