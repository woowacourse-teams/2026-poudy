import type { DiscordEmbed } from "./embeds/shared.ts";

export type DiscordDeliveryResult =
  | { readonly kind: "delivered" }
  | { readonly kind: "invalid-webhook-url" }
  | { readonly kind: "rate-limited"; readonly retryAfterSeconds: number | undefined }
  | { readonly kind: "failed" };

const deliveryTimeoutMs = 5_000;

function parseRetryAfterSeconds(response: Response): number | undefined {
  const retryAfter = Number.parseFloat(response.headers.get("Retry-After") ?? "");

  return Number.isFinite(retryAfter) ? retryAfter : undefined;
}

function buildWebhookUrl(webhookUrl: string): URL | undefined {
  try {
    const url = new URL(webhookUrl);
    url.searchParams.set("wait", "true");

    return url;
  } catch {
    return undefined;
  }
}

async function postEmbed(url: URL, embed: DiscordEmbed): Promise<DiscordDeliveryResult> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ embeds: [embed], allowed_mentions: { parse: [] } }),
    signal: AbortSignal.timeout(deliveryTimeoutMs),
  });

  if (response.ok) {
    return { kind: "delivered" };
  }

  if (response.status === 429) {
    return { kind: "rate-limited", retryAfterSeconds: parseRetryAfterSeconds(response) };
  }

  return { kind: "failed" };
}

export async function sendDiscordEmbed(webhookUrl: string, embed: DiscordEmbed): Promise<DiscordDeliveryResult> {
  const url = buildWebhookUrl(webhookUrl);

  if (!url) {
    return { kind: "invalid-webhook-url" };
  }

  try {
    return await postEmbed(url, embed);
  } catch (error) {
    if (error instanceof Error) {
      return { kind: "failed" };
    }
    throw error;
  }
}
