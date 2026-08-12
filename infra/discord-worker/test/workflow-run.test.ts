import assert from "node:assert/strict";
import test from "node:test";

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

const pullRequest = {
  number: 15,
  draft: false,
  merged: false,
  user: user("inaemin"),
  title: "feat : Discord 알림 개선",
  body: "## 작업 내용\n\nCI 결과를 PR 알림에 붙입니다.",
  html_url: "https://github.test/pull/15",
  head: { ref: "feat/discord-worker", sha: workflowRun.head_sha },
  base: { ref: "dev" },
  updated_at: "2026-08-11T00:00:00Z",
};

// KV 바인딩을 흉내 내 PR 알림과 CI 결과가 서로를 찾아가는지 본다.
// delayMs 를 주면 읽기가 늦어져, 두 요청이 같은 값을 읽는 경합을 재현할 수 있다.
function fakeKv(delayMs = 0) {
  const store = new Map<string, string>();

  return {
    get: async (key: string) => {
      if (delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }

      const raw = store.get(key);
      return raw ? JSON.parse(raw) : null;
    },
    put: async (key: string, value: string) => {
      store.set(key, value);
    },
  };
}

type Sent = { method: string; url: string; body: DiscordBody };

// GitHub API 조회는 비우고 Discord 요청만 기록한다.
function captureDiscord(sent: Sent[], messageId = "msg-1") {
  globalThis.fetch = async (input, init) => {
    const url = input.toString();

    if (url.startsWith("https://api.github")) {
      return new Response(JSON.stringify([]), { status: 200 });
    }

    sent.push({ method: init?.method ?? "GET", url, body: parseRequestBody(init) });
    return new Response(JSON.stringify({ id: messageId }), { status: 200 });
  };
}

function workerEnv(kv: ReturnType<typeof fakeKv>) {
  return { ...env, WORKFLOW_RUNS: kv } as unknown as Parameters<typeof worker.fetch>[1];
}

test("adds CI results to the pull request message instead of a new one", async () => {
  const kv = fakeKv();
  const sent: Sent[] = [];
  const realFetch = globalThis.fetch;
  captureDiscord(sent);

  assert.equal(
    (
      await worker.fetch(
        signedRequest("pull_request", { action: "opened", pull_request: pullRequest, repository }),
        workerEnv(kv),
      )
    ).status,
    200,
  );
  assert.equal((await worker.fetch(signedRequest("workflow_run", payload), workerEnv(kv))).status, 200);
  assert.equal(
    (
      await worker.fetch(
        signedRequest("workflow_run", {
          ...payload,
          workflow_run: { ...workflowRun, name: "Client CI", conclusion: "failure" },
        }),
        workerEnv(kv),
      )
    ).status,
    200,
  );
  globalThis.fetch = realFetch;

  // PR 알림만 새 메시지고, CI 결과는 그 메시지를 고친다.
  assert.deepEqual(
    sent.map((request) => request.method),
    ["POST", "PATCH", "PATCH"],
  );
  assert.match(sent[1]?.url ?? "", /\/messages\/msg-1/);

  const ci = sent[2]?.body.embeds[0]?.fields?.find((field) => field.name === "CI");
  assert.ok(ci, "CI 필드가 있어야 합니다");
  assert.match(ci.value, /✅ \[Server CI\]/);
  assert.match(ci.value, /❌ \[Client CI\]/);
  // PR 본문은 첫 문단까지만 싣는다.
  assert.match(sent[2]?.body.embeds[0]?.description ?? "", /CI 결과를 PR 알림에 붙입니다/);
});

test("drops earlier CI results when a new commit is pushed", async () => {
  const kv = fakeKv();
  const sent: Sent[] = [];
  const realFetch = globalThis.fetch;
  captureDiscord(sent);

  const open = signedRequest("pull_request", { action: "opened", pull_request: pullRequest, repository });
  await worker.fetch(open, workerEnv(kv));
  await worker.fetch(signedRequest("workflow_run", payload), workerEnv(kv));

  // 커밋을 푸시하면 head sha 가 바뀌고 알림은 보내지 않는다.
  const pushed = { ...pullRequest, head: { ref: pullRequest.head.ref, sha: "999888777666" } };
  const sync = await worker.fetch(
    signedRequest("pull_request", { action: "synchronize", pull_request: pushed, repository }),
    workerEnv(kv),
  );

  // 새 커밋의 CI 는 여전히 같은 PR 메시지를 찾아간다.
  await worker.fetch(
    signedRequest("workflow_run", {
      ...payload,
      workflow_run: { ...workflowRun, head_sha: "999888777666", name: "Client CI", conclusion: "failure" },
    }),
    workerEnv(kv),
  );
  globalThis.fetch = realFetch;

  assert.equal(sync.status, 200);
  const ci = sent.at(-1)?.body.embeds[0]?.fields?.find((field) => field.name === "CI");
  assert.ok(ci);
  // 이전 커밋의 결과는 남지 않는다.
  assert.equal(ci.value.includes("Server CI"), false);
  assert.match(ci.value, /❌ \[Client CI\]/);
});

test("sends a separate message when no pull request message was stored", async () => {
  const kv = fakeKv();
  const sent: Sent[] = [];
  const realFetch = globalThis.fetch;
  captureDiscord(sent);

  const response = await worker.fetch(signedRequest("workflow_run", payload), workerEnv(kv));
  globalThis.fetch = realFetch;

  // 붙일 PR 메시지를 못 찾아도 결과를 잃지 않는다.
  assert.equal(response.status, 200);
  assert.equal(sent.length, 1);
  assert.equal(sent[0]?.method, "POST");
});

test("ignores workflow runs for a superseded commit", async () => {
  const kv = fakeKv();
  const sent: Sent[] = [];
  const realFetch = globalThis.fetch;
  captureDiscord(sent);

  await worker.fetch(
    signedRequest("pull_request", { action: "opened", pull_request: pullRequest, repository }),
    workerEnv(kv),
  );

  // 새 커밋을 푸시하면 PR 레코드가 그 sha 를 가리킨다.
  const pushed = { ...pullRequest, head: { ref: pullRequest.head.ref, sha: "999888777666" } };
  await worker.fetch(
    signedRequest("pull_request", { action: "synchronize", pull_request: pushed, repository }),
    workerEnv(kv),
  );

  const before = sent.length;
  // 뒤늦게 도착한 이전 커밋의 결과는 PR 레코드를 되돌리지 않는다.
  const response = await worker.fetch(signedRequest("workflow_run", payload), workerEnv(kv));
  globalThis.fetch = realFetch;

  assert.equal(response.status, 200);
  assert.equal(sent.length, before);
});

test("keeps a result written by another workflow while this one was running", async () => {
  const kv = fakeKv();
  const sent: Sent[] = [];
  const realFetch = globalThis.fetch;
  captureDiscord(sent);

  await worker.fetch(
    signedRequest("pull_request", { action: "opened", pull_request: pullRequest, repository }),
    workerEnv(kv),
  );

  // Discord 로 보내는 동안 다른 워크플로가 결과를 먼저 저장한 상황을 만든다.
  const prKey = `pr:${repository.full_name}#15`;
  const original = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const url = input.toString();

    if (!url.startsWith("https://api.github")) {
      const snapshot = (await kv.get(prKey)) as { outcomes: unknown[] } | null;

      if (snapshot && snapshot.outcomes.length === 0) {
        await kv.put(
          prKey,
          JSON.stringify({
            ...snapshot,
            outcomes: [{ name: "Client CI", conclusion: "failure", html_url: "https://github.test/runs/client" }],
          }),
        );
      }
    }

    return original(input, init);
  };

  await worker.fetch(signedRequest("workflow_run", payload), workerEnv(kv));
  globalThis.fetch = realFetch;

  // 쓰기 직전에 다시 읽어 합치므로 그 사이 들어온 결과가 사라지지 않는다.
  const stored = (await kv.get(prKey)) as { outcomes: { name: string }[] } | null;
  assert.ok(stored);
  assert.deepEqual(stored.outcomes.map((outcome) => outcome.name).sort(), ["Client CI", "Server CI"]);
});

test("posts a new message when the stored one was deleted", async () => {
  const kv = fakeKv();
  const methods: string[] = [];
  const realFetch = globalThis.fetch;

  globalThis.fetch = async (input, init) => {
    const url = input.toString();

    if (url.startsWith("https://api.github")) {
      return new Response(JSON.stringify([]), { status: 200 });
    }

    const method = init?.method ?? "GET";
    methods.push(method);

    // 지워진 메시지를 고치려 하면 404 가 온다.
    if (method === "PATCH") {
      return new Response("not found", { status: 404 });
    }
    return new Response(JSON.stringify({ id: "msg-new" }), { status: 200 });
  };

  await worker.fetch(
    signedRequest("pull_request", { action: "opened", pull_request: pullRequest, repository }),
    workerEnv(kv),
  );
  const response = await worker.fetch(signedRequest("workflow_run", payload), workerEnv(kv));
  globalThis.fetch = realFetch;

  assert.equal(response.status, 200);
  assert.deepEqual(methods, ["POST", "PATCH", "POST"]);
});

test("sends merged branch workflows to the deployment channel", async () => {
  const sent: Sent[] = [];
  const realFetch = globalThis.fetch;
  captureDiscord(sent);

  const response = await worker.fetch(
    signedRequest("workflow_run", {
      ...payload,
      workflow_run: { ...workflowRun, event: "push", head_branch: "dev" },
    }),
    env,
  );
  globalThis.fetch = realFetch;

  assert.equal(response.status, 200);
  // dev 에 머지된 뒤 도는 워크플로는 PR 메시지와 무관하게 그대로 알린다.
  assert.equal(sent.length, 1);
  assert.equal(sent[0]?.method, "POST");
  assert.match(sent[0]?.url ?? "", /discord\.test\/staging/);
});

test("shows the pull request title instead of the merge commit subject", async () => {
  const sent: Sent[] = [];
  const realFetch = globalThis.fetch;
  captureDiscord(sent);

  // 머지 커밋의 display_title 은 git 이 만든 문장이라 어떤 작업인지 알 수 없다.
  const response = await worker.fetch(
    signedRequest("workflow_run", {
      ...payload,
      workflow_run: {
        ...workflowRun,
        event: "push",
        head_branch: "dev",
        display_title: "Merge pull request #22 from woowacourse-teams/feat/api-zod",
        head_commit: {
          message: "Merge pull request #22 from woowacourse-teams/feat/api-zod\n\nfeat : zod 스키마 생성 추가",
        },
      },
    }),
    env,
  );
  globalThis.fetch = realFetch;

  assert.equal(response.status, 200);
  const embed = sent[0]?.body.embeds[0];
  assert.ok(embed);
  // 제목에 어떤 워크플로인지 드러난다.
  assert.match(embed.title, /Server CI 성공/);
  // 본문에는 머지 커밋 제목 대신 실제 PR 제목이 실린다.
  assert.match(embed.description ?? "", /feat : zod 스키마 생성 추가/);
  assert.equal((embed.description ?? "").includes("Merge pull request"), false);
});

test("links the commit and shows the commit subject for a direct push", async () => {
  const sent: Sent[] = [];
  const realFetch = globalThis.fetch;
  captureDiscord(sent);

  // 머지가 아니라 dev 에 바로 푸시한 경우다.
  const response = await worker.fetch(
    signedRequest("workflow_run", {
      ...payload,
      workflow_run: {
        ...workflowRun,
        event: "push",
        head_branch: "dev",
        display_title: "fix : 오타 수정",
        head_commit: { message: "fix : 오타 수정\n\n- 문구를 다듬었다" },
      },
    }),
    env,
  );
  globalThis.fetch = realFetch;

  assert.equal(response.status, 200);
  const embed = sent[0]?.body.embeds[0];
  assert.ok(embed);
  assert.match(embed.description ?? "", /fix : 오타 수정/);
  // 붙일 PR 이 없으므로 PR 줄은 넣지 않는다.
  assert.equal((embed.description ?? "").includes("PR 보기"), false);

  // 커밋은 언제나 눌러서 확인할 수 있어야 한다.
  const commit = embed.fields?.find((field) => field.name === "커밋");
  assert.ok(commit);
  assert.match(commit.value, /\/commit\/abcdef1234567890/);
});
