import type { DiscordEmbed } from "./embeds/shared.ts";

export type DiscordDeliveryResult =
  | { readonly kind: "delivered"; readonly messageId: string | undefined }
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

// wait=true 로 보내면 Discord 가 만들어진 메시지를 돌려준다. 그 id 를 알아야
// 같은 커밋의 다음 워크플로가 끝났을 때 새 메시지 대신 이 메시지를 고칠 수 있다.
async function readMessageId(response: Response): Promise<string | undefined> {
  try {
    const body = (await response.json()) as { id?: unknown };

    return typeof body.id === "string" ? body.id : undefined;
  } catch {
    return undefined;
  }
}

async function toDeliveryResult(response: Response): Promise<DiscordDeliveryResult> {
  if (response.ok) {
    return { kind: "delivered", messageId: await readMessageId(response) };
  }

  if (response.status === 429) {
    return { kind: "rate-limited", retryAfterSeconds: parseRetryAfterSeconds(response) };
  }

  return { kind: "failed" };
}

async function requestDiscord(url: URL, method: string, embed: DiscordEmbed): Promise<DiscordDeliveryResult> {
  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ embeds: [embed], allowed_mentions: { parse: [] } }),
    signal: AbortSignal.timeout(deliveryTimeoutMs),
  });

  return toDeliveryResult(response);
}

type DeliveryTarget = { readonly method: string; readonly messageId?: string | undefined };

async function deliver(webhookUrl: string, target: DeliveryTarget, embed: DiscordEmbed) {
  const url = buildWebhookUrl(webhookUrl);

  if (!url) {
    return { kind: "invalid-webhook-url" } as const;
  }

  if (target.messageId) {
    url.pathname = `${url.pathname}/messages/${target.messageId}`;
  }

  try {
    return await requestDiscord(url, target.method, embed);
  } catch (error) {
    if (error instanceof Error) {
      return { kind: "failed" } as const;
    }
    throw error;
  }
}

export async function sendDiscordEmbed(webhookUrl: string, embed: DiscordEmbed): Promise<DiscordDeliveryResult> {
  return deliver(webhookUrl, { method: "POST" }, embed);
}

// 메시지가 지워졌거나 너무 오래되면 수정이 실패한다. 호출하는 쪽에서 새로 보내도록
// failed 를 그대로 돌려준다.
export async function editDiscordEmbed(
  webhookUrl: string,
  messageId: string,
  embed: DiscordEmbed,
): Promise<DiscordDeliveryResult> {
  return deliver(webhookUrl, { method: "PATCH", messageId }, embed);
}
