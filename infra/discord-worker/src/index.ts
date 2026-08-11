import { z } from "zod";

import { type DiscordDeliveryResult, editDiscordEmbed, sendDiscordEmbed } from "./discord.ts";
import { deploymentStatusEmbed, workflowRunEmbed } from "./embeds/cicd.ts";
import {
  issueCommentEmbed,
  issueEmbed,
  pullRequestEmbed,
  pullRequestReviewEmbed,
  storedPullRequestEmbed,
} from "./embeds/collaboration.ts";
import { discussionCommentEmbed, discussionEmbed, wikiEmbed } from "./embeds/community.ts";
import type { DiscordEmbed } from "./embeds/shared.ts";
import {
  type ParsedGitHubEvent,
  type PullRequestPayload,
  parseGitHubEvent,
  type WorkflowRunPayload,
} from "./github-event.ts";
import { assertNever, type WorkerEnv, webhookKeyFor } from "./routing.ts";
import { commitKey, mergeOutcome, pullRequestKey, readMessage, writeMessage } from "./workflow-group.ts";

export type { WorkerEnv } from "./routing.ts";

type WorkerHandler = {
  readonly fetch: (request: Request, env: WorkerEnv) => Promise<Response>;
};

type WebhookRequestParseResult =
  | { readonly kind: "response"; readonly response: Response }
  | { readonly kind: "parsed"; readonly parsedEvent: ParsedGitHubEvent };

const encoder = new TextEncoder();

async function handleRequest(request: Request, env: WorkerEnv): Promise<Response> {
  if (request.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: { Allow: "POST" },
    });
  }

  const githubSecret = env.GITHUB_WEBHOOK_SECRET;

  if (!githubSecret) {
    return new Response("Missing GitHub webhook secret", { status: 500 });
  }

  const parseResult = await parseWebhookRequest(request, githubSecret);

  switch (parseResult.kind) {
    case "response":
      return parseResult.response;
    case "parsed":
      return deliverParsedEvent(parseResult.parsedEvent, env);
    default:
      return assertNever(parseResult);
  }
}

function hexToBytes(hex: string): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(new ArrayBuffer(hex.length / 2));

  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }

  return bytes;
}

async function hasValidSignature(body: string, signature: string | null, secret: string): Promise<boolean> {
  if (!signature?.startsWith("sha256=") || !/^[0-9a-f]{64}$/i.test(signature.slice(7))) {
    return false;
  }

  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "verify",
  ]);

  return crypto.subtle.verify("HMAC", key, hexToBytes(signature.slice(7)), encoder.encode(body));
}

function createEmbed(parsedEvent: ParsedGitHubEvent): DiscordEmbed | undefined {
  switch (parsedEvent.event) {
    case "pull_request":
      return pullRequestEmbed(parsedEvent.payload);
    case "pull_request_review":
      return pullRequestReviewEmbed(parsedEvent.payload);
    case "issues":
      return issueEmbed(parsedEvent.payload);
    case "issue_comment":
      return issueCommentEmbed(parsedEvent.payload);
    case "discussion":
      return discussionEmbed(parsedEvent.payload);
    case "discussion_comment":
      return discussionCommentEmbed(parsedEvent.payload);
    case "gollum":
      return wikiEmbed(parsedEvent.payload);
    // PR 에서 도는 CI 는 deliverWorkflowRun 이 PR 메시지에 붙인다. 여기까지 오는 것은
    // 머지된 뒤 도는 워크플로뿐이라 그대로 알린다.
    case "workflow_run":
      return workflowRunEmbed(parsedEvent.payload);
    case "deployment_status":
      return deploymentStatusEmbed(parsedEvent.payload);
    default:
      return assertNever(parsedEvent);
  }
}

async function parseWebhookRequest(request: Request, githubSecret: string): Promise<WebhookRequestParseResult> {
  const body = await request.text();
  const signature = request.headers.get("X-Hub-Signature-256");

  if (!(await hasValidSignature(body, signature, githubSecret))) {
    return {
      kind: "response",
      response: new Response("Invalid signature", { status: 401 }),
    };
  }

  const event = request.headers.get("X-GitHub-Event");

  if (!event) {
    return { kind: "response", response: new Response("Missing GitHub event", { status: 400 }) };
  }

  let rawPayload: unknown;
  try {
    rawPayload = JSON.parse(body);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return {
        kind: "response",
        response: new Response("Invalid JSON", { status: 400 }),
      };
    }
    throw error;
  }

  let parsedEvent: ParsedGitHubEvent | undefined;
  try {
    parsedEvent = parseGitHubEvent(event, rawPayload);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        kind: "response",
        response: new Response("Invalid GitHub payload", { status: 400 }),
      };
    }
    throw error;
  }

  if (!parsedEvent) {
    return {
      kind: "response",
      response: new Response("Ignored", { status: 200 }),
    };
  }

  return { kind: "parsed", parsedEvent };
}

function deliveryResponse(result: DiscordDeliveryResult, webhookKey: string): Response {
  switch (result.kind) {
    case "delivered":
      return new Response("Delivered", { status: 200 });
    // 재전송해도 같은 결과이므로 GitHub 재시도를 유도하지 않는다.
    case "invalid-webhook-url":
      console.error(`Invalid Discord webhook URL: ${webhookKey}`);
      return new Response("Invalid Discord webhook URL", { status: 200 });
    case "rate-limited":
      console.error(`Discord rate limited: ${webhookKey}`, result.retryAfterSeconds);
      return new Response("Discord rate limited", { status: 200 });
    case "failed":
      return new Response("Discord delivery failed", { status: 502 });
    default:
      return assertNever(result);
  }
}

type WebhookTarget = { readonly url: string; readonly key: string };

// PR 알림을 보낸 뒤, 그 PR 에서 도는 CI 가 찾아올 수 있도록 message_id 를 남긴다.
async function deliverPullRequest(
  payload: PullRequestPayload,
  target: WebhookTarget,
  env: WorkerEnv,
): Promise<Response> {
  const pullRequest = payload.pull_request;
  const repository = payload.repository.full_name;
  const prKey = pullRequestKey(repository, pullRequest.number);
  const previous = await readMessage(env.WORKFLOW_RUNS, prKey);
  const embed = pullRequestEmbed(payload, previous?.outcomes ?? []);

  // 커밋을 푸시하면 head sha 가 바뀐다. 알림을 보내지 않는 synchronize 에서도
  // 새 sha 를 이어 두어야 그 커밋의 CI 가 기존 PR 메시지를 찾을 수 있다.
  if (!embed) {
    if (previous) {
      const carried =
        previous.head_sha === pullRequest.head.sha
          ? previous
          : { ...previous, head_sha: pullRequest.head.sha, outcomes: [] };

      await writeMessage(env.WORKFLOW_RUNS, [prKey, commitKey(repository, pullRequest.head.sha)], carried);
    }

    return new Response("Ignored", { status: 200 });
  }

  // 머지나 리뷰 준비 같은 다음 소식은 새 메시지로 알린다. 수정만 하면 알림이 울리지 않는다.
  const result = await sendDiscordEmbed(target.url, embed);

  if (result.kind === "delivered" && result.messageId) {
    await writeMessage(env.WORKFLOW_RUNS, [prKey, commitKey(repository, pullRequest.head.sha)], {
      messageId: result.messageId,
      number: pullRequest.number,
      title_line: embed.title,
      color: embed.color,
      title: pullRequest.title,
      body: pullRequest.body ?? null,
      html_url: pullRequest.html_url,
      head_ref: pullRequest.head.ref,
      base_ref: pullRequest.base.ref,
      head_sha: pullRequest.head.sha,
      // 새 커밋이 올라오면 이전 CI 결과는 더 이상 유효하지 않다.
      outcomes: previous && previous.head_sha === pullRequest.head.sha ? previous.outcomes : [],
    });
  }

  return deliveryResponse(result, target.key);
}

// PR 에서 도는 CI 는 별도 알림을 만들지 않고 그 PR 메시지의 CI 줄만 고친다.
async function deliverWorkflowRun(
  payload: WorkflowRunPayload,
  target: WebhookTarget,
  env: WorkerEnv,
): Promise<Response> {
  const run = payload.workflow_run;

  if (payload.action !== "completed") {
    return new Response("Ignored", { status: 200 });
  }

  const key = commitKey(payload.repository.full_name, run.head_sha);
  const stored = await readMessage(env.WORKFLOW_RUNS, key);

  // PR 메시지를 찾지 못하면 붙일 곳이 없다. 알림을 새로 만들지는 않는다.
  if (!stored) {
    return new Response("Ignored", { status: 200 });
  }

  const outcomes = mergeOutcome(stored.outcomes, {
    name: run.name,
    conclusion: run.conclusion,
    html_url: run.html_url,
  });
  const updated = { ...stored, outcomes };
  const result = await editDiscordEmbed(target.url, stored.messageId, storedPullRequestEmbed(updated, payload));

  if (result.kind === "delivered") {
    await writeMessage(env.WORKFLOW_RUNS, [pullRequestKey(payload.repository.full_name, stored.number), key], updated);
  }

  return deliveryResponse(result, target.key);
}

async function deliverParsedEvent(parsedEvent: ParsedGitHubEvent, env: WorkerEnv): Promise<Response> {
  const webhookKey = webhookKeyFor(parsedEvent);

  if (!webhookKey) {
    return new Response("Ignored", { status: 200 });
  }

  const webhookUrl = env[webhookKey];

  if (!webhookUrl) {
    return new Response(`Missing Discord webhook: ${webhookKey}`, {
      status: 500,
    });
  }

  const target = { url: webhookUrl, key: webhookKey };

  if (parsedEvent.event === "pull_request") {
    return deliverPullRequest(parsedEvent.payload, target, env);
  }

  // PR 채널로 가는 workflow_run 만 PR 메시지에 붙인다. 머지 후 도는 것은 그대로 보낸다.
  if (parsedEvent.event === "workflow_run" && webhookKey === "DISCORD_WEBHOOK_PR_UPDATE") {
    return deliverWorkflowRun(parsedEvent.payload, target, env);
  }

  const embed = createEmbed(parsedEvent);

  if (!embed) {
    return new Response("Ignored", { status: 200 });
  }

  return deliveryResponse(await sendDiscordEmbed(webhookUrl, embed), webhookKey);
}

export default { fetch: handleRequest } satisfies WorkerHandler;
