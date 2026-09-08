import { z } from "zod";

import type { WorkerEnv } from "./routing.ts";

// 알림을 받을 채널. Discord Webhook URL 을 쏘는 쪽에 알리지 않으려고 이름만 받는다.
const channels = {
  issue: "DISCORD_WEBHOOK_ISSUE_UPDATE",
  pr: "DISCORD_WEBHOOK_PR_UPDATE",
  staging: "DISCORD_WEBHOOK_STAGING",
  production: "DISCORD_WEBHOOK_PRODUCTION",
  wiki: "DISCORD_WEBHOOK_WIKI_UPDATE",
} as const satisfies Readonly<Record<string, keyof WorkerEnv>>;

export type NotifyChannel = keyof typeof channels;

const channelSchema = z.enum(Object.keys(channels) as [NotifyChannel, ...NotifyChannel[]]);

// 어느 알림에나 있는 자리. 보내는 쪽은 어느 채널로 갈지와 언제 일어난 일인지만
// 고르고, 무엇을 어떻게 보일지는 embeds/ 가 정한다.
const baseFields = {
  channel: channelSchema,
  // 언제 일어난 일인지. 없으면 Worker 가 받은 시각을 쓴다.
  timestamp: z.iso.datetime().optional(),
  // 알림 아래에 남길 저장소 이름. 여러 저장소가 한 채널을 함께 쓸 때 구분한다.
  repository: z.string().min(1).max(140).optional(),
};

const seoScoreSchema = z.object({
  performance: z.number().int().min(0).max(100).nullable(),
  accessibility: z.number().int().min(0).max(100).nullable(),
  bestPractices: z.number().int().min(0).max(100).nullable(),
  seo: z.number().int().min(0).max(100).nullable(),
});

export type SeoScores = z.infer<typeof seoScoreSchema>;

// 보내는 쪽은 잰 값만 넘긴다. 제목도 색도 표도 embeds/seo.ts 가 정한다.
const seoReportSchema = z.object({
  ...baseFields,
  kind: z.literal("seo-report"),
  siteUrl: z.url(),
  indexable: z.boolean(),
  scores: seoScoreSchema,
  runUrl: z.url().optional(),
});

export type SeoReport = z.infer<typeof seoReportSchema>;

// 알림 종류를 더하려면 여기에 스키마를, embeds/ 에 모양을 더한다. 보내는 쪽이
// 제목이나 색을 넘기는 자리는 두지 않는다. 그래야 알림 모양이 한곳에 모인다.
export const notifySchema = z.discriminatedUnion("kind", [seoReportSchema]);

export type NotifyPayload = z.infer<typeof notifySchema>;

export function channelWebhookKey(channel: NotifyChannel): keyof WorkerEnv {
  return channels[channel];
}

function bearerToken(header: string | null): string | undefined {
  // 헤더 이름은 대소문자를 가리지 않지만 스킴은 가린다. curl 로 손수 쓸 때
  // "bearer" 로 적는 일이 흔해 둘 다 받는다.
  const match = header?.match(/^Bearer\s+(\S+)$/i);

  return match?.[1];
}

// Workers 런타임에는 timingSafeEqual 이 없다. 두 값을 같은 임의 키로 HMAC 해
// 고정 길이 다이제스트끼리 비교하면, 앞자리가 몇 개 맞는지가 걸린 시간에
// 드러나지 않는다.
async function equalsInConstantTime(left: string, right: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    crypto.getRandomValues(new Uint8Array(32)),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const [leftDigest, rightDigest] = await Promise.all([
    crypto.subtle.sign("HMAC", key, encoder.encode(left)),
    crypto.subtle.sign("HMAC", key, encoder.encode(right)),
  ]);
  const leftBytes = new Uint8Array(leftDigest);
  const rightBytes = new Uint8Array(rightDigest);
  let difference = 0;

  for (let index = 0; index < leftBytes.length; index += 1) {
    difference |= (leftBytes[index] ?? 0) ^ (rightBytes[index] ?? 0);
  }

  return difference === 0;
}

export async function hasValidNotifyToken(header: string | null, expected: string): Promise<boolean> {
  const token = bearerToken(header);

  return token === undefined ? false : equalsInConstantTime(token, expected);
}
