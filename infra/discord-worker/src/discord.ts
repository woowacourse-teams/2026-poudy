import type { DiscordEmbed } from "./embeds/shared.ts";

export function sendDiscordEmbed(
  webhookUrl: string,
  embed: DiscordEmbed,
): Promise<Response> {
  return fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      embeds: [embed],
      allowed_mentions: { parse: [] },
    }),
  });
}
