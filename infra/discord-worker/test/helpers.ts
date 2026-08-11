import { createHmac } from "node:crypto";
import { z } from "zod";

import type { WorkerEnv } from "../src/index.ts";

export const secret = "test-github-secret";

export const webhookUrls = {
  issue: "https://discord.test/issue",
  pr: "https://discord.test/pr",
  staging: "https://discord.test/staging",
  production: "https://discord.test/production?thread_id=1",
  wiki: "https://discord.test/wiki",
} as const;

export const env = {
  GITHUB_WEBHOOK_SECRET: secret,
  DISCORD_WEBHOOK_ISSUE_UPDATE: webhookUrls.issue,
  DISCORD_WEBHOOK_PR_UPDATE: webhookUrls.pr,
  DISCORD_WEBHOOK_STAGING_CICD: webhookUrls.staging,
  DISCORD_WEBHOOK_PRODUCTION_CICD: webhookUrls.production,
  DISCORD_WEBHOOK_WIKI_UPDATE: webhookUrls.wiki,
} satisfies WorkerEnv;

export function user(login: string) {
  return {
    login,
    type: "User",
    html_url: `https://github.test/${login}`,
    avatar_url: `https://avatars.test/${login}.png`,
  } as const;
}

export const repository = {
  full_name: "woowacourse-teams/2026-poudy",
  html_url: "https://github.test/woowacourse-teams/2026-poudy",
  owner: user("team"),
} as const;

export const discordBodySchema = z.object({
  embeds: z.array(
    z
      .object({
        title: z.string(),
        url: z.string(),
        description: z.string().optional(),
        author: z.object({ name: z.string() }),
      })
      .loose(),
  ),
  allowed_mentions: z.object({ parse: z.array(z.string()) }),
  content: z.string().optional(),
});

export type DiscordBody = z.infer<typeof discordBodySchema>;

export function parseRequestBody(init: RequestInit | undefined): DiscordBody {
  if (typeof init?.body !== "string") {
    throw new TypeError("Expected a JSON string request body");
  }

  return discordBodySchema.parse(JSON.parse(init.body));
}

export function signedRequest(event: string, payload: unknown, bodyOverride?: string): Request {
  const body = bodyOverride ?? JSON.stringify(payload);
  const signature = createHmac("sha256", secret).update(body).digest("hex");

  return new Request("https://worker.test", {
    method: "POST",
    headers: {
      "X-GitHub-Event": event,
      "X-Hub-Signature-256": `sha256=${signature}`,
    },
    body,
  });
}
