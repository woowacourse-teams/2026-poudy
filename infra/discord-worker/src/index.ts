import { z } from "zod";

import { sendDiscordEmbed } from "./discord.ts";
import { deploymentStatusEmbed, workflowRunEmbed } from "./embeds/cicd.ts";
import { issueCommentEmbed, issueEmbed, pullRequestEmbed, pullRequestReviewEmbed } from "./embeds/collaboration.ts";
import { discussionCommentEmbed, discussionEmbed, wikiEmbed } from "./embeds/community.ts";
import type { DiscordEmbed } from "./embeds/shared.ts";
import { type ParsedGitHubEvent, parseGitHubEvent } from "./github-event.ts";
import { assertNever, type WorkerEnv, webhookKeyFor } from "./routing.ts";

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
    case "workflow_run":
      return workflowRunEmbed(parsedEvent.payload);
    case "deployment_status":
      return deploymentStatusEmbed(parsedEvent.payload);
    default:
      return assertNever(parsedEvent);
  }
}

function parseJson(body: string): unknown {
  return JSON.parse(body);
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
    rawPayload = parseJson(body);
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

async function deliverParsedEvent(parsedEvent: ParsedGitHubEvent, env: WorkerEnv): Promise<Response> {
  const embed = createEmbed(parsedEvent);
  const webhookKey = webhookKeyFor(parsedEvent);

  if (!embed || !webhookKey) {
    return new Response("Ignored", { status: 200 });
  }

  const webhookUrl = env[webhookKey];

  if (!webhookUrl) {
    return new Response(`Missing Discord webhook: ${webhookKey}`, {
      status: 500,
    });
  }

  const delivered = await sendDiscordEmbed(webhookUrl, embed);

  if (!delivered) {
    return new Response("Discord delivery failed", { status: 502 });
  }

  return new Response("Delivered", { status: 200 });
}

export default { fetch: handleRequest } satisfies WorkerHandler;
