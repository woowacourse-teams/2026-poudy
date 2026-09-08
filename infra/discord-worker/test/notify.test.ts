import assert from "node:assert/strict";
import test from "node:test";

import { seoReportEmbed } from "../src/embeds/seo.ts";
import worker from "../src/index.ts";
import { env, parseRequestBody, webhookUrls } from "./helpers.ts";

const token = "test-notify-token";

const notifyEnv = { ...env, NOTIFY_TOKEN: token };

const report = {
  kind: "seo-report",
  channel: "production",
  siteUrl: "https://poudy.test",
  indexable: true,
  scores: { performance: 87, accessibility: 100, bestPractices: 92, seo: 64 },
  runUrl: "https://github.test/woowacourse-teams/2026-poudy/actions/runs/1",
  repository: "woowacourse-teams/2026-poudy",
} as const;

// 기본값은 undefined 를 넘겨도 채워지므로, 헤더를 아예 빼는 뜻은 null 로 적는다.
function notifyRequest(payload: unknown, authorization: string | null = `Bearer ${token}`): Request {
  return new Request("https://worker.test/notify", {
    method: "POST",
    headers: authorization === null ? {} : { Authorization: authorization },
    body: typeof payload === "string" ? payload : JSON.stringify(payload),
  });
}

test("보낸 SEO 결과를 채널이 가리키는 Discord 로 넘긴다", async () => {
  let captured: { url: string; body: ReturnType<typeof parseRequestBody> } | undefined;

  globalThis.fetch = async (input, init) => {
    captured = { url: String(input), body: parseRequestBody(init) };

    return new Response(JSON.stringify({ id: "1" }), { status: 200 });
  };

  assert.equal((await worker.fetch(notifyRequest(report), notifyEnv)).status, 200);
  assert.ok(captured?.url.startsWith(webhookUrls.production));

  const embed = captured?.body.embeds[0];

  assert.equal(embed?.title, "🔍 운영 SEO 측정");
  assert.equal(embed?.url, report.siteUrl);
  assert.match(embed?.description ?? "", /색인 허용: ✅ 열려 있음/);
  // 점수는 고정폭 표에 담기므로 이름과 숫자가 같은 줄에 있어야 한다.
  assert.match(embed?.description ?? "", /Performance\s+87/);
  assert.match(embed?.description ?? "", /SEO\s+64/);
  assert.match(embed?.description ?? "", /실행 기록 보기/);
});

test("색인이 막히면 제목과 색으로 먼저 알린다", async () => {
  let captured: ReturnType<typeof parseRequestBody> | undefined;

  globalThis.fetch = async (_input, init) => {
    captured = parseRequestBody(init);

    return new Response(JSON.stringify({ id: "1" }), { status: 200 });
  };

  await worker.fetch(notifyRequest({ ...report, indexable: false }), notifyEnv);

  const embed = captured?.embeds[0];

  assert.equal(embed?.title, "❌ 운영 화면이 색인에서 막혔습니다");
  assert.match(embed?.description ?? "", /색인 허용: ❌ 막혀 있음/);
  // 사고를 알리는 색이라 초록과 달라야 한다.
  assert.equal(embed?.color, 15548997);
  assert.equal(seoReportEmbed(report).color, 5763719);
});

test("자격이 없거나 형식이 어긋난 요청은 보내지 않는다", async () => {
  let sent = false;

  globalThis.fetch = async () => {
    sent = true;

    return new Response(JSON.stringify({ id: "1" }), { status: 200 });
  };

  // 토큰 없음, 스킴 없음, 값이 다름
  assert.equal((await worker.fetch(notifyRequest(report, null), notifyEnv)).status, 401);
  assert.equal((await worker.fetch(notifyRequest(report, token), notifyEnv)).status, 401);
  assert.equal((await worker.fetch(notifyRequest(report, `Bearer ${token}x`), notifyEnv)).status, 401);
  // 자격을 확인하기 전에 본문을 읽지 않는다.
  assert.equal((await worker.fetch(notifyRequest("{", null), notifyEnv)).status, 401);

  assert.equal((await worker.fetch(notifyRequest("{"), notifyEnv)).status, 400);
  assert.equal((await worker.fetch(notifyRequest({ ...report, kind: "unknown" }), notifyEnv)).status, 400);
  // kind 를 빼면 무엇을 그릴지 알 수 없다.
  assert.equal((await worker.fetch(notifyRequest({ ...report, kind: undefined }), notifyEnv)).status, 400);
  assert.equal((await worker.fetch(notifyRequest({ ...report, channel: "nowhere" }), notifyEnv)).status, 400);
  assert.equal((await worker.fetch(notifyRequest({ ...report, siteUrl: "not-a-url" }), notifyEnv)).status, 400);
  assert.equal(
    (await worker.fetch(notifyRequest({ ...report, scores: { ...report.scores, seo: 140 } }), notifyEnv)).status,
    400,
  );

  // 토큰을 등록하지 않았으면 설정을 채우라는 뜻으로 500 을 준다.
  assert.equal((await worker.fetch(notifyRequest(report), env)).status, 500);

  assert.equal(sent, false);
});

test("스킴 대소문자를 가리지 않고, 채널에 Webhook 이 없으면 알린다", async () => {
  globalThis.fetch = async () => new Response(JSON.stringify({ id: "1" }), { status: 200 });

  assert.equal((await worker.fetch(notifyRequest(report, `bearer ${token}`), notifyEnv)).status, 200);

  const { DISCORD_WEBHOOK_PRODUCTION: _production, ...withoutProduction } = notifyEnv;

  assert.equal((await worker.fetch(notifyRequest(report), withoutProduction)).status, 500);
});

test("보내는 쪽이 알림 모양을 정하려 해도 받지 않는다", async () => {
  let captured: ReturnType<typeof parseRequestBody> | undefined;

  globalThis.fetch = async (_input, init) => {
    captured = parseRequestBody(init);

    return new Response(JSON.stringify({ id: "1" }), { status: 200 });
  };

  // 제목과 색을 실어 보내도 스키마에 없는 자리라 무시되고, Worker 가 정한 값이 간다.
  const status = (
    await worker.fetch(
      notifyRequest({ ...report, title: "내 마음대로 제목", color: 1, description: "내 본문" }),
      notifyEnv,
    )
  ).status;

  assert.equal(status, 200);
  assert.equal(captured?.embeds[0]?.title, "🔍 운영 SEO 측정");
  assert.doesNotMatch(captured?.embeds[0]?.description ?? "", /내 본문/);
});

test("잰 시각을 보내면 그 시각으로, 없으면 받은 시각으로 남긴다", async () => {
  let captured: ReturnType<typeof parseRequestBody> | undefined;

  globalThis.fetch = async (_input, init) => {
    captured = parseRequestBody(init);

    return new Response(JSON.stringify({ id: "1" }), { status: 200 });
  };

  await worker.fetch(notifyRequest({ ...report, timestamp: "2026-09-08T01:02:03Z" }), notifyEnv);
  assert.equal(captured?.embeds[0]?.timestamp, "2026-09-08T01:02:03Z");

  await worker.fetch(notifyRequest(report), notifyEnv);
  assert.ok(typeof captured?.embeds[0]?.timestamp === "string");
});

test("GET 은 받지 않고, GitHub Webhook 경로는 그대로 둔다", async () => {
  assert.equal((await worker.fetch(new Request("https://worker.test/notify"), notifyEnv)).status, 405);

  // /notify 를 더해도 서명 검증을 거치는 기존 경로는 달라지지 않는다.
  assert.equal(
    (await worker.fetch(new Request("https://worker.test/", { method: "POST", body: "{}" }), notifyEnv)).status,
    401,
  );
});
