import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import { checkDeploymentHeartbeat } from "../src/deployment.ts";
import worker from "../src/index.ts";
import type { WorkerEnv } from "../src/routing.ts";
import { env, parseRequestBody, webhookUrls } from "./helpers.ts";

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});
const token = "deployment-test-credential";
const report = {
  kind: "deployment-status",
  eventId: "d-TEST:Failed",
  deploymentId: "d-TEST",
  group: "poudy-backend-staging-dg",
  status: "Failed",
  timestamp: "2026-10-29T00:00:00Z",
  errorCode: "HEALTH_CONSTRAINTS",
  test: true,
};

function setup() {
  const store = new Map<string, string>();
  const storage = {
    get: async (key: string) => store.get(key) ?? null,
    put: async (key: string, value: string) => {
      store.set(key, value);
    },
    delete: async (key: string) => {
      store.delete(key);
    },
  };
  const context = { ...env, DEPLOY_NOTIFY_TOKEN: token, WORKFLOW_RUNS: storage } as unknown as WorkerEnv;
  return { store, context };
}

function request(payload: unknown, path = "/deployment-notify", credential = token) {
  return new Request(`https://worker.test${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${credential}` },
    body: JSON.stringify(payload),
  });
}

test("배포 그룹으로 채널을 결정하고 성공한 이벤트의 재전송을 억제한다", async () => {
  const { context } = setup();
  const calls: string[] = [];
  globalThis.fetch = async (input, init) => {
    calls.push(String(input));
    assert.match(parseRequestBody(init).embeds[0]?.title ?? "", /TEST.*staging.*BE.*배포 실패/);
    return new Response(JSON.stringify({ id: "1" }));
  };
  assert.equal((await worker.fetch(request(report), context)).status, 200);
  assert.equal(await (await worker.fetch(request(report), context)).text(), "Already delivered");
  assert.equal(calls.length, 1);
  assert.ok(calls[0]?.startsWith(webhookUrls.staging));
});

test("429는 성공으로 기록하지 않아 재전송할 수 있다", async () => {
  const { store, context } = setup();
  globalThis.fetch = async () => new Response("limited", { status: 429, headers: { "Retry-After": "90" } });
  const response = await worker.fetch(request(report), context);
  assert.equal(response.status, 429);
  assert.equal(response.headers.get("Retry-After"), "90");
  assert.equal(store.has("ops:delivery:test:d-TEST:Failed"), false);
  globalThis.fetch = async () => new Response(JSON.stringify({ id: "2" }));
  assert.equal((await worker.fetch(request(report), context)).status, 200);
});

test("별도 인증과 팀 배포 그룹 및 이벤트 ID의 일치를 검사한다", async () => {
  const { context } = setup();
  globalThis.fetch = async () => {
    throw new Error("must not deliver");
  };
  assert.equal((await worker.fetch(request(report, "/deployment-notify", "seo-token"), context)).status, 401);
  assert.equal((await worker.fetch(request({ ...report, group: "other-team" }), context)).status, 400);
  assert.equal((await worker.fetch(request({ ...report, eventId: "d-OTHER:Failed" }), context)).status, 400);
});

test("네트워크 오류도 성공으로 응답하거나 저장하지 않는다", async () => {
  const { store, context } = setup();
  globalThis.fetch = async () => {
    throw new Error("network unavailable");
  };
  assert.equal((await worker.fetch(request(report), context)).status, 503);
  assert.equal(store.size, 0);
});

test("외부 감시는 최초 heartbeat 이후 중단을 한 번 알리고 연결 회복을 구분한다", async () => {
  const { store, context } = setup();
  const titles: string[] = [];
  globalThis.fetch = async (_input, init) => {
    titles.push(parseRequestBody(init).embeds[0]?.title ?? "");
    return new Response(JSON.stringify({ id: "3" }));
  };
  await checkDeploymentHeartbeat(context);
  assert.equal(titles.length, 0);
  store.set("ops:heartbeat", String(Date.now() - 16 * 60_000));
  await checkDeploymentHeartbeat(context);
  await checkDeploymentHeartbeat(context);
  assert.equal(titles.length, 1);
  assert.match(titles[0] ?? "", /응답 없음/);
  assert.equal((await worker.fetch(request({}, "/deployment-heartbeat"), context)).status, 200);
  assert.match(titles[1] ?? "", /연결 회복/);
  assert.equal(store.has("ops:stale"), false);
});

test("Grafana resolved는 배포 복구로 보내지 않고 firing만 환경별로 전달한다", async () => {
  const { context } = setup();
  const calls: string[] = [];
  globalThis.fetch = async (input) => {
    calls.push(String(input));
    return new Response(JSON.stringify({ id: "4" }));
  };
  const alert = {
    status: "resolved",
    fingerprint: "sample",
    startsAt: "2026-10-29T00:00:00Z",
    labels: { environment: "staging", source: "deployment-observer" },
    annotations: { summary: "[TEST] failure count" },
  };
  await worker.fetch(request({ alerts: [alert] }, "/grafana-notify"), context);
  assert.equal(calls.length, 0);
  await worker.fetch(request({ alerts: [{ ...alert, status: "firing" }] }, "/grafana-notify"), context);
  assert.equal(calls.length, 1);
  assert.ok(calls[0]?.startsWith(webhookUrls.staging));
});
