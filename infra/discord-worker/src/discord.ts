import type { DiscordEmbed } from "./embeds/shared.ts";

export async function sendDiscordEmbed(webhookUrl: string, embed: DiscordEmbed): Promise<boolean> {
  try {
    const url = new URL(webhookUrl);
    url.searchParams.set("wait", "true");
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        embeds: [embed],
        allowed_mentions: { parse: [] },
      }),
      signal: AbortSignal.timeout(5_000),
    });

    return response.ok;
  } catch (error) {
    if (error instanceof Error) {
      return false;
    }
    throw error;
  }
}
