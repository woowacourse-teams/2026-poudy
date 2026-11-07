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
  created_at: "2026-08-11T00:00:00Z",
  updated_at: "2026-08-11T00:00:00Z",
  pull_requests: [{ number: 15, head: { sha: "abcdef1234567890" }, base: { ref: "dev" } }],
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
// writes 는 put 이 불린 키를 차례로 남긴다. 무료 플랜의 쓰기 한도를 지키는지 본다.
function fakeKv(delayMs = 0) {
  const store = new Map<string, string>();
  const writes: string[] = [];

  return {
    writes,
    get: async (key: string) => {
      if (delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }

      const raw = store.get(key);
      return raw ? JSON.parse(raw) : null;
    },
    put: async (key: string, value: string) => {
      writes.push(key);
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
      workflow_run: {
        ...workflowRun,
        head_sha: "999888777666",
        name: "Client CI",
        conclusion: "failure",
        created_at: "2026-08-11T01:00:00Z",
        pull_requests: [{ number: 15, head: { sha: "999888777666" }, base: { ref: "dev" } }],
      },
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

  // 새 커밋의 CI 가 먼저 끝나 PR 레코드가 그 sha 를 가리킨다.
  await worker.fetch(
    signedRequest("workflow_run", {
      ...payload,
      workflow_run: {
        ...workflowRun,
        head_sha: "999888777666",
        created_at: "2026-08-11T01:00:00Z",
        pull_requests: [{ number: 15, head: { sha: "999888777666" }, base: { ref: "dev" } }],
      },
    }),
    workerEnv(kv),
  );

  const before = sent.length;
  // 새 푸시로 취소된 이전 커밋의 결과가 뒤늦게 도착해도 PR 레코드를 되돌리지 않는다.
  const response = await worker.fetch(
    signedRequest("workflow_run", { ...payload, workflow_run: { ...workflowRun, conclusion: "cancelled" } }),
    workerEnv(kv),
  );
  globalThis.fetch = realFetch;

  assert.equal(response.status, 200);
  assert.equal(sent.length, before);
  const stored = (await kv.get(`pr:${repository.full_name}#15`)) as { head_sha: string } | null;
  assert.equal(stored?.head_sha, "999888777666");
});

test("ignores a cancelled run of a commit the pull request has moved past", async () => {
  const kv = fakeKv();
  const sent: Sent[] = [];
  const realFetch = globalThis.fetch;
  captureDiscord(sent);

  await worker.fetch(
    signedRequest("pull_request", { action: "opened", pull_request: pullRequest, repository }),
    workerEnv(kv),
  );
  const writes = kv.writes.length;
  const before = sent.length;

  // 새 커밋을 푸시해 이전 커밋의 CI 가 취소됐다. pull_requests 의 head 는 이미 새 커밋이다.
  const response = await worker.fetch(
    signedRequest("workflow_run", {
      ...payload,
      workflow_run: {
        ...workflowRun,
        conclusion: "cancelled",
        pull_requests: [{ number: 15, head: { sha: "999888777666" }, base: { ref: "dev" } }],
      },
    }),
    workerEnv(kv),
  );
  globalThis.fetch = realFetch;

  assert.equal(response.status, 200);
  assert.equal(sent.length, before);
  assert.equal(kv.writes.length, writes);
});

test("writes to KV only when a message is sent or edited", async () => {
  const kv = fakeKv();
  const sent: Sent[] = [];
  const realFetch = globalThis.fetch;
  captureDiscord(sent);

  await worker.fetch(
    signedRequest("pull_request", { action: "opened", pull_request: pullRequest, repository }),
    workerEnv(kv),
  );
  // 알림을 보내지 않는 이벤트는 KV 에 쓰지 않는다. 무료 플랜의 쓰기는 하루 1,000번이다.
  const pushed = { ...pullRequest, head: { ref: pullRequest.head.ref, sha: "999888777666" } };
  for (const action of ["synchronize", "labeled", "edited", "assigned"]) {
    await worker.fetch(signedRequest("pull_request", { action, pull_request: pushed, repository }), workerEnv(kv));
  }
  await worker.fetch(signedRequest("workflow_run", payload), workerEnv(kv));
  globalThis.fetch = realFetch;

  // PR 알림 한 번, CI 결과 한 번을 PR 키 하나에만 쓴다.
  assert.deepEqual(kv.writes, [`pr:${repository.full_name}#15`, `pr:${repository.full_name}#15`]);
});

test("attaches workflows that run when a pull request is merged", async () => {
  const kv = fakeKv();
  const sent: Sent[] = [];
  const realFetch = globalThis.fetch;
  captureDiscord(sent);

  await worker.fetch(
    signedRequest("pull_request", { action: "opened", pull_request: pullRequest, repository }),
    workerEnv(kv),
  );
  const merged = { ...pullRequest, merged: true, merged_by: user("inaemin") };
  await worker.fetch(
    signedRequest("pull_request", { action: "closed", pull_request: merged, repository }),
    workerEnv(kv),
  );

  // 닫힐 때 도는 워크플로는 이미 닫힌 PR 이라 pull_requests 가 비어 있다.
  const response = await worker.fetch(
    signedRequest("workflow_run", {
      ...payload,
      workflow_run: { ...workflowRun, name: "Release Tag", pull_requests: [] },
    }),
    workerEnv(kv),
  );
  globalThis.fetch = realFetch;

  assert.equal(response.status, 200);
  // 닫힐 때 커밋에 남긴 번호로 머지 메시지를 찾아 고친다.
  assert.deepEqual(
    sent.map((request) => request.method),
    ["POST", "POST", "PATCH"],
  );
  const embed = sent.at(-1)?.body.embeds[0];
  assert.match(embed?.title ?? "", /🎉 Pull Request 머지 완료/);
  assert.match(embed?.fields?.find((field) => field.name === "CI")?.value ?? "", /✅ \[Release Tag\]/);
  // 커밋 키는 닫힐 때 한 번만 쓰고, 결과는 PR 키에 쌓는다.
  assert.deepEqual(kv.writes, [
    `pr:${repository.full_name}#15`,
    `pr:${repository.full_name}#15`,
    `sha:${repository.full_name}@${workflowRun.head_sha}`,
    `pr:${repository.full_name}#15`,
  ]);
});

test("ignores an older commit's run that arrives after the pull request becomes ready for review", async () => {
  const kv = fakeKv();
  const sent: Sent[] = [];
  const realFetch = globalThis.fetch;
  captureDiscord(sent);

  // 커밋 X 로 초안을 열고 Y 를 푸시한 뒤 리뷰 준비로 바꿨다. 초안은 알리지 않아 기록이 없다.
  const ready = {
    ...pullRequest,
    head: { ref: pullRequest.head.ref, sha: "999888777666" },
    updated_at: "2026-08-11T02:00:00Z",
  };
  await worker.fetch(
    signedRequest("pull_request", { action: "ready_for_review", pull_request: ready, repository }),
    workerEnv(kv),
  );

  const before = sent.length;
  // 리뷰 준비 전에 만들어진 X 의 취소 결과가 뒤늦게 도착한다.
  await worker.fetch(
    signedRequest("workflow_run", {
      ...payload,
      workflow_run: { ...workflowRun, conclusion: "cancelled", created_at: "2026-08-11T01:00:00Z" },
    }),
    workerEnv(kv),
  );
  globalThis.fetch = realFetch;

  assert.equal(sent.length, before);
  const stored = (await kv.get(`pr:${repository.full_name}#15`)) as { head_sha: string } | null;
  assert.equal(stored?.head_sha, "999888777666");
});

test("does not carry an older commit's CI results into the merge message", async () => {
  const kv = fakeKv();
  const sent: Sent[] = [];
  const realFetch = globalThis.fetch;
  captureDiscord(sent);

  await worker.fetch(
    signedRequest("pull_request", { action: "opened", pull_request: pullRequest, repository }),
    workerEnv(kv),
  );
  await worker.fetch(signedRequest("workflow_run", payload), workerEnv(kv));

  // 새 커밋을 푸시하고 그 커밋의 CI 가 끝나기 전에 머지했다.
  const merged = {
    ...pullRequest,
    head: { ref: pullRequest.head.ref, sha: "999888777666" },
    merged: true,
    merged_by: user("inaemin"),
  };
  await worker.fetch(
    signedRequest("pull_request", { action: "closed", pull_request: merged, repository }),
    workerEnv(kv),
  );
  globalThis.fetch = realFetch;

  const embed = sent.at(-1)?.body.embeds[0];
  assert.match(embed?.title ?? "", /🎉 Pull Request 머지 완료/);
  assert.equal(embed?.fields?.some((field) => field.name === "CI") ?? false, false);
});

test("attaches to the pull request that has a message when a commit belongs to several", async () => {
  const kv = fakeKv();
  const sent: Sent[] = [];
  const realFetch = globalThis.fetch;
  captureDiscord(sent);

  await worker.fetch(
    signedRequest("pull_request", { action: "opened", pull_request: pullRequest, repository }),
    workerEnv(kv),
  );
  // 같은 브랜치에서 dev 와 main 으로 PR 을 열어 두면 pull_requests 에 둘 다 실린다.
  await worker.fetch(
    signedRequest("workflow_run", {
      ...payload,
      workflow_run: {
        ...workflowRun,
        pull_requests: [
          { number: 16, head: { sha: workflowRun.head_sha }, base: { ref: "main" } },
          { number: 15, head: { sha: workflowRun.head_sha }, base: { ref: "dev" } },
        ],
      },
    }),
    workerEnv(kv),
  );
  globalThis.fetch = realFetch;

  assert.deepEqual(
    sent.map((request) => request.method),
    ["POST", "PATCH"],
  );
});

test("ignores workflow runs from fork pull requests", async () => {
  const kv = fakeKv();
  const sent: Sent[] = [];
  const realFetch = globalThis.fetch;
  captureDiscord(sent);

  // fork 에서 온 PR 은 pull_requests 가 비어 있다. fork PR 은 받지 않는다.
  const response = await worker.fetch(
    signedRequest("workflow_run", { ...payload, workflow_run: { ...workflowRun, pull_requests: [] } }),
    workerEnv(kv),
  );
  globalThis.fetch = realFetch;

  assert.equal(response.status, 200);
  assert.equal(sent.length, 0);
  assert.equal(kv.writes.length, 0);
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
  // 커밋 메시지에서 꺼낸 번호로 PR 링크를 만든다.
  assert.match(embed.description ?? "", /\[#22 PR 보기\]\([^)]*\/pull\/22\)/);
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

test("edits the open message into a closed one when a pull request is closed without merging", async () => {
  const kv = fakeKv();
  const sent: Sent[] = [];
  const realFetch = globalThis.fetch;
  captureDiscord(sent);

  await worker.fetch(
    signedRequest("pull_request", { action: "opened", pull_request: pullRequest, repository }),
    workerEnv(kv),
  );
  await worker.fetch(signedRequest("workflow_run", payload), workerEnv(kv));
  const response = await worker.fetch(
    signedRequest("pull_request", { action: "closed", pull_request: pullRequest, repository }),
    workerEnv(kv),
  );
  globalThis.fetch = realFetch;

  assert.equal(response.status, 200);
  // 닫힘은 새 알림을 울리지 않고 기존 메시지만 고친다.
  assert.deepEqual(
    sent.map((request) => request.method),
    ["POST", "PATCH", "PATCH"],
  );
  assert.match(sent.at(-1)?.url ?? "", /\/messages\/msg-1/);

  const embed = sent.at(-1)?.body.embeds[0];
  assert.ok(embed);
  assert.match(embed.title, /🚫 Pull Request 닫힘/);
  // red 는 배포·CI 실패의 색이라 머지하지 않은 닫힘에는 gray 를 쓴다.
  assert.equal(embed.color, 9807270);
  // 이미 붙은 CI 결과는 그대로 남는다.
  assert.match(embed.fields?.find((field) => field.name === "CI")?.value ?? "", /✅ \[Server CI\]/);
});

test("sends a closing message when the stored pull request record has expired", async () => {
  const kv = fakeKv();
  const sent: Sent[] = [];
  const realFetch = globalThis.fetch;
  captureDiscord(sent);

  // KV 기록 없이 닫힘만 도착한 상황이다. TTL 이 지난 오래된 PR 이 여기에 해당한다.
  const response = await worker.fetch(
    signedRequest("pull_request", { action: "closed", pull_request: pullRequest, repository }),
    workerEnv(kv),
  );
  globalThis.fetch = realFetch;

  assert.equal(response.status, 200);
  assert.equal(sent.length, 1);
  assert.equal(sent[0]?.method, "POST");
  assert.match(sent[0]?.body.embeds[0]?.title ?? "", /🚫 Pull Request 닫힘/);
});

test("sends a closing message when the stored message was deleted", async () => {
  const kv = fakeKv();
  const methods: string[] = [];
  const realFetch = globalThis.fetch;

  globalThis.fetch = async (_input, init) => {
    const method = init?.method ?? "GET";
    methods.push(method);

    // 지워진 메시지를 고치려 하면 404 가 온다.
    if (method === "PATCH") {
      return new Response("not found", { status: 404 });
    }
    return new Response(JSON.stringify({ id: "msg-1" }), { status: 200 });
  };

  await worker.fetch(
    signedRequest("pull_request", { action: "opened", pull_request: pullRequest, repository }),
    workerEnv(kv),
  );
  const response = await worker.fetch(
    signedRequest("pull_request", { action: "closed", pull_request: pullRequest, repository }),
    workerEnv(kv),
  );
  globalThis.fetch = realFetch;

  assert.equal(response.status, 200);
  assert.deepEqual(methods, ["POST", "PATCH", "POST"]);
});

test("keeps sending a new message when a pull request is merged", async () => {
  const kv = fakeKv();
  const sent: Sent[] = [];
  const realFetch = globalThis.fetch;
  captureDiscord(sent);

  await worker.fetch(
    signedRequest("pull_request", { action: "opened", pull_request: pullRequest, repository }),
    workerEnv(kv),
  );
  const merged = { ...pullRequest, merged: true, merged_by: user("inaemin") };
  const response = await worker.fetch(
    signedRequest("pull_request", { action: "closed", pull_request: merged, repository }),
    workerEnv(kv),
  );
  globalThis.fetch = realFetch;

  assert.equal(response.status, 200);
  // 머지는 알릴 만한 소식이라 예전처럼 새 메시지를 보낸다.
  assert.deepEqual(
    sent.map((request) => request.method),
    ["POST", "POST"],
  );
  assert.match(sent.at(-1)?.body.embeds[0]?.title ?? "", /🎉 Pull Request 머지 완료/);
});

test("stays silent when a draft pull request is closed without merging", async () => {
  const kv = fakeKv();
  const sent: Sent[] = [];
  const realFetch = globalThis.fetch;
  captureDiscord(sent);

  // 초안은 열릴 때 알리지 않으므로 닫힐 때도 고칠 메시지가 없다.
  const response = await worker.fetch(
    signedRequest("pull_request", { action: "closed", pull_request: { ...pullRequest, draft: true }, repository }),
    workerEnv(kv),
  );
  globalThis.fetch = realFetch;

  assert.equal(response.status, 200);
  assert.equal(sent.length, 0);
});
