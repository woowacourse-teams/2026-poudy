import type { ParsedGitHubEvent } from "./github-event.ts";

export type WorkerEnv = {
  readonly GITHUB_WEBHOOK_SECRET?: string;
  readonly DISCORD_WEBHOOK_ISSUE_UPDATE?: string;
  readonly DISCORD_WEBHOOK_PR_UPDATE?: string;
  readonly DISCORD_WEBHOOK_STAGING_CICD?: string;
  readonly DISCORD_WEBHOOK_PRODUCTION_CICD?: string;
  readonly DISCORD_WEBHOOK_WIKI_UPDATE?: string;
};

type WebhookKey = Exclude<keyof WorkerEnv, "GITHUB_WEBHOOK_SECRET">;

const webhookKeys = {
  issueUpdate: "DISCORD_WEBHOOK_ISSUE_UPDATE",
  prUpdate: "DISCORD_WEBHOOK_PR_UPDATE",
  stagingCicd: "DISCORD_WEBHOOK_STAGING_CICD",
  productionCicd: "DISCORD_WEBHOOK_PRODUCTION_CICD",
  wikiUpdate: "DISCORD_WEBHOOK_WIKI_UPDATE",
} as const satisfies Readonly<Record<string, WebhookKey>>;

function cicdWebhookKey(
  target: string | null | undefined,
): WebhookKey | undefined {
  const normalizedTarget = target?.toLowerCase();

  if (!normalizedTarget) {
    return undefined;
  }

  if (
    normalizedTarget === "main" ||
    normalizedTarget === "master" ||
    /^(production|prod)([-_/]|$)/.test(normalizedTarget)
  ) {
    return webhookKeys.productionCicd;
  }

  if (
    /^(staging|stage|dev|develop|development)([-_/]|$)/.test(normalizedTarget)
  ) {
    return webhookKeys.stagingCicd;
  }

  return undefined;
}

function assertNever(value: never): never {
  return value;
}

export function webhookKeyFor(
  parsedEvent: ParsedGitHubEvent,
): WebhookKey | undefined {
  switch (parsedEvent.event) {
    case "pull_request":
    case "pull_request_review":
      return webhookKeys.prUpdate;
    case "issue_comment":
      return parsedEvent.payload.issue.pull_request
        ? webhookKeys.prUpdate
        : webhookKeys.issueUpdate;
    case "issues":
    case "discussion":
    case "discussion_comment":
      return webhookKeys.issueUpdate;
    case "gollum":
      return webhookKeys.wikiUpdate;
    case "workflow_run": {
      const run = parsedEvent.payload.workflow_run;

      if (run.event === "pull_request") {
        return webhookKeys.stagingCicd;
      }

      return cicdWebhookKey(
        run.pull_requests?.[0]?.base.ref ?? run.head_branch,
      );
    }
    case "deployment_status":
      return cicdWebhookKey(
        parsedEvent.payload.deployment.environment ??
          parsedEvent.payload.deployment.ref,
      );
    default:
      return assertNever(parsedEvent);
  }
}
