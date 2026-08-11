import assert from "node:assert/strict";
import test from "node:test";

import { webhookKeyFor } from "../src/routing.ts";
import { repository, user } from "./helpers.ts";

function workflowRun(overrides: {
  readonly event?: string;
  readonly head_branch?: string;
  readonly pull_requests?: { base: { ref: string } }[];
}) {
  return {
    event: "push",
    conclusion: "success",
    name: "Server CI",
    head_branch: "dev",
    head_sha: "abcdef123456",
    run_number: 1,
    run_attempt: 1,
    actor: user("alice"),
    html_url: "https://github.test/actions/1",
    updated_at: "2026-08-10T00:00:00Z",
    ...overrides,
  };
}

function workflowRunKey(overrides: Parameters<typeof workflowRun>[0]) {
  return webhookKeyFor({
    event: "workflow_run",
    payload: { action: "completed", workflow_run: workflowRun(overrides), repository },
  });
}

function deploymentStatusKey(environment: string | null, ref = "main") {
  return webhookKeyFor({
    event: "deployment_status",
    payload: {
      deployment: { environment, ref, sha: "abcdef123456", description: null },
      deployment_status: {
        state: "success",
        environment_url: null,
        log_url: null,
        target_url: null,
        description: null,
        updated_at: "2026-08-10T00:00:00Z",
      },
      sender: user("alice"),
      repository,
    },
  });
}

test("routes collaboration events by their discussion surface", () => {
  const issue = {
    number: 1,
    state: "open",
    title: "Issue",
    body: null,
    html_url: "https://github.test/issues/1",
  };
  const comment = {
    user: user("alice"),
    body: "댓글",
    html_url: "https://github.test/comment/1",
    created_at: "2026-08-10T00:00:00Z",
  };

  // PR 에 달린 댓글은 이슈가 아니라 PR 채널로 간다.
  assert.equal(
    webhookKeyFor({
      event: "issue_comment",
      payload: { action: "created", issue: { ...issue, pull_request: {} }, comment, repository },
    }),
    "DISCORD_WEBHOOK_PR_UPDATE",
  );
  assert.equal(
    webhookKeyFor({
      event: "issue_comment",
      payload: { action: "created", issue, comment, repository },
    }),
    "DISCORD_WEBHOOK_ISSUE_UPDATE",
  );
});

test("routes workflow runs by the branch being merged into", () => {
  // PR 워크플로는 대상 브랜치와 무관하게 staging 으로 모은다.
  assert.equal(workflowRunKey({ event: "pull_request", head_branch: "feature/embed" }), "DISCORD_WEBHOOK_STAGING_CICD");

  // base ref 가 있으면 head_branch 보다 우선한다.
  assert.equal(
    workflowRunKey({
      event: "push",
      head_branch: "feature/embed",
      pull_requests: [{ base: { ref: "main" } }],
    }),
    "DISCORD_WEBHOOK_PRODUCTION_CICD",
  );

  assert.equal(workflowRunKey({ head_branch: "main" }), "DISCORD_WEBHOOK_PRODUCTION_CICD");
  assert.equal(workflowRunKey({ head_branch: "master" }), "DISCORD_WEBHOOK_PRODUCTION_CICD");
  assert.equal(workflowRunKey({ head_branch: "dev" }), "DISCORD_WEBHOOK_STAGING_CICD");
  assert.equal(workflowRunKey({ head_branch: "develop" }), "DISCORD_WEBHOOK_STAGING_CICD");

  // CI 는 dev/main 머지에서만 도므로 그 밖의 브랜치는 알림 대상이 아니다.
  assert.equal(workflowRunKey({ head_branch: "feature/embed" }), undefined);
});

test("matches environment prefixes only on a word boundary", () => {
  assert.equal(deploymentStatusKey("production"), "DISCORD_WEBHOOK_PRODUCTION_CICD");
  assert.equal(deploymentStatusKey("prod-kr"), "DISCORD_WEBHOOK_PRODUCTION_CICD");
  assert.equal(deploymentStatusKey("Production"), "DISCORD_WEBHOOK_PRODUCTION_CICD");
  assert.equal(deploymentStatusKey("staging/api"), "DISCORD_WEBHOOK_STAGING_CICD");

  // 접두사가 단어 경계에서 끝나지 않으면 매칭하지 않는다.
  assert.equal(deploymentStatusKey("production-mirror"), "DISCORD_WEBHOOK_PRODUCTION_CICD");
  assert.equal(deploymentStatusKey("reproduction"), undefined);
  assert.equal(deploymentStatusKey("devops"), undefined);

  // environment 가 비면 ref 로 판단한다.
  assert.equal(deploymentStatusKey("", "main"), "DISCORD_WEBHOOK_PRODUCTION_CICD");
  assert.equal(deploymentStatusKey(null, "dev"), "DISCORD_WEBHOOK_STAGING_CICD");
});
