import assert from "node:assert/strict";
import test from "node:test";

import worker from "../src/index.ts";
import type { DiscordBody } from "./helpers.ts";
import {
  env,
  parseRequestBody,
  repository,
  signedRequest,
  user,
  webhookUrls,
} from "./helpers.ts";

type EventFixture = readonly [
  event: string,
  payload: unknown,
  expectedUrl: string,
  expectedTitle: RegExp,
];

test("routes every supported GitHub event as one rich Discord embed", async () => {
  const pullRequest = {
    number: 12,
    draft: false,
    merged: false,
    user: user("alice"),
    title: "Discord Embed 적용",
    body: "PR 본문입니다.",
    html_url: "https://github.test/pull/12",
    head: { ref: "feature/embed" },
    base: { ref: "dev" },
    updated_at: "2026-08-10T00:00:00Z",
  };
  const issue = {
    number: 7,
    state: "open",
    title: "이슈 제목",
    body: "재현 절차입니다.",
    html_url: "https://github.test/issues/7",
    labels: [{ name: "bug" }],
    assignees: [user("carol")],
    updated_at: "2026-08-10T00:00:00Z",
  };
  const discussion = {
    user: user("dave"),
    title: "아키텍처 논의",
    body: "어떤 구조가 좋을까요?",
    html_url: "https://github.test/discussions/1",
    category: { name: "Ideas" },
    comments: 3,
    updated_at: "2026-08-10T00:00:00Z",
  };
  const fixtures: readonly EventFixture[] = [
    [
      "pull_request",
      { action: "opened", pull_request: pullRequest, repository },
      webhookUrls.pr,
      /Pull Request/,
    ],
    [
      "pull_request_review",
      {
        action: "submitted",
        pull_request: {
          number: pullRequest.number,
          user: pullRequest.user,
          title: pullRequest.title,
          body: pullRequest.body,
          html_url: pullRequest.html_url,
        },
        review: {
          state: "approved",
          user: user("bob"),
          body: "좋습니다.",
          html_url: "https://github.test/review/1",
          submitted_at: "2026-08-10T00:00:00Z",
        },
        repository,
      },
      webhookUrls.pr,
      /승인/,
    ],
    [
      "issues",
      { action: "opened", issue, sender: user("erin"), repository },
      webhookUrls.issue,
      /이슈/,
    ],
    [
      "issue_comment",
      {
        action: "created",
        issue,
        comment: {
          user: user("frank"),
          body: "확인했습니다.",
          html_url: "https://github.test/comment/1",
          created_at: "2026-08-10T00:00:00Z",
        },
        repository,
      },
      webhookUrls.issue,
      /댓글/,
    ],
    [
      "discussion",
      { action: "created", discussion, repository },
      webhookUrls.issue,
      /Discussion/,
    ],
    [
      "discussion_comment",
      {
        action: "created",
        discussion,
        comment: {
          user: user("gina"),
          body: "동의합니다.",
          html_url: "https://github.test/discussion-comment/1",
          is_answer: true,
          updated_at: "2026-08-10T00:00:00Z",
        },
        repository,
      },
      webhookUrls.issue,
      /댓글/,
    ],
    [
      "gollum",
      {
        pages: [
          {
            action: "edited",
            title: "Home",
            summary: null,
            sha: "62b130abcdef",
            html_url: "https://github.test/wiki/Home",
          },
        ],
        sender: user("inaemin"),
        repository,
      },
      webhookUrls.wiki,
      /Wiki/,
    ],
    [
      "workflow_run",
      {
        action: "completed",
        workflow_run: {
          event: "pull_request",
          conclusion: "success",
          name: "Server CI",
          head_branch: "feature/embed",
          head_sha: "abcdef123456",
          run_number: 24,
          run_attempt: 1,
          actor: user("harry"),
          html_url: "https://github.test/actions/24",
          updated_at: "2026-08-10T00:00:00Z",
          pull_requests: [],
        },
        repository,
      },
      webhookUrls.staging,
      /CI\/CD 성공/,
    ],
    [
      "deployment_status",
      {
        deployment: {
          environment: "production",
          ref: "main",
          sha: "1234567890abcdef",
        },
        deployment_status: {
          state: "success",
          environment_url: "https://poudy.test",
          updated_at: "2026-08-10T00:00:00Z",
        },
        sender: user("ivy"),
        repository,
      },
      webhookUrls.production,
      /배포 성공/,
    ],
  ];
  const calls: Array<{ readonly url: string; readonly body: DiscordBody }> = [];
  globalThis.fetch = async (input, init) => {
    const url = input instanceof Request ? input.url : input.toString();
    calls.push({ url, body: parseRequestBody(init) });
    return new Response(null, { status: 204 });
  };

  for (const [event, payload, expectedUrl, expectedTitle] of fixtures) {
    const response = await worker.fetch(signedRequest(event, payload), env);
    const call = calls.at(-1);

    assert.equal(response.status, 200, event);
    assert.ok(call, event);
    assert.equal(call.url, `${expectedUrl}?wait=true`, event);
    assert.equal(call.body.embeds.length, 1, event);
    const embed = call.body.embeds[0];
    assert.ok(embed, event);
    assert.match(embed.title, expectedTitle, event);
    assert.deepEqual(call.body.allowed_mentions, { parse: [] }, event);
    assert.equal(call.body.content, undefined, event);
  }

  assert.equal(calls.length, fixtures.length);
});
