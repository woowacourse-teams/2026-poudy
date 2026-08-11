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

const issuePayload = {
  action: "opened",
  issue: {
    number: 1,
    state: "open",
    title: "Issue",
    body: null,
    html_url: "https://github.test/issues/1",
    labels: [],
    assignees: [],
    updated_at: "2026-08-10T00:00:00Z",
  },
  sender: user("alice"),
  repository,
};

test("rejects malformed requests and reports delivery failures", async () => {
  assert.equal(
    (await worker.fetch(new Request("https://worker.test"), env)).status,
    405,
  );
  assert.equal(
    (
      await worker.fetch(
        new Request("https://worker.test", { method: "POST", body: "{}" }),
        {},
      )
    ).status,
    500,
  );
  assert.equal(
    (
      await worker.fetch(
        new Request("https://worker.test", {
          method: "POST",
          headers: { "X-Hub-Signature-256": "sha256=bad" },
          body: "{}",
        }),
        env,
      )
    ).status,
    401,
  );
  assert.equal(
    (await worker.fetch(signedRequest("issues", {}, "{"), env)).status,
    400,
  );
  assert.equal(
    (await worker.fetch(signedRequest("ping", {}), env)).status,
    200,
  );
  assert.equal(
    (
      await worker.fetch(signedRequest("issues", issuePayload), {
        GITHUB_WEBHOOK_SECRET: env.GITHUB_WEBHOOK_SECRET,
      })
    ).status,
    500,
  );

  globalThis.fetch = async () => new Response("failed", { status: 429 });
  assert.equal(
    (await worker.fetch(signedRequest("issues", issuePayload), env)).status,
    502,
  );

  globalThis.fetch = async () => {
    throw new TypeError("network down");
  };
  assert.equal(
    (await worker.fetch(signedRequest("issues", issuePayload), env)).status,
    502,
  );
});

test("falls back for empty deployment URLs and deleted users", async () => {
  let sent: DiscordBody | undefined;
  let sentUrl: string | undefined;
  globalThis.fetch = async (input, init) => {
    sentUrl = input.toString();
    sent = parseRequestBody(init);
    return new Response(null, { status: 204 });
  };
  const payload = {
    deployment: {
      environment: "production",
      ref: "main",
      sha: "abcdef123456",
      description: null,
    },
    deployment_status: {
      state: "success",
      environment_url: "",
      log_url: "",
      target_url: "",
      description: null,
      updated_at: "2026-08-10T00:00:00Z",
    },
    sender: null,
    repository,
  };

  const response = await worker.fetch(
    signedRequest("deployment_status", payload),
    env,
  );

  assert.equal(response.status, 200);
  assert.ok(sent);
  const embed = sent.embeds[0];
  assert.ok(embed);
  assert.equal(embed.url, repository.html_url);
  assert.equal(embed.author.name, "삭제된 사용자");
  assert.equal(embed.description, undefined);
  assert.equal(sentUrl, `${webhookUrls.production}?wait=true`);
});
