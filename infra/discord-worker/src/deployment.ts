import { z } from "zod";

import { sendDiscordEmbed } from "./discord.ts";
import { type DiscordEmbed, embedColors } from "./embeds/shared.ts";
import { hasValidNotifyToken } from "./notify.ts";
import type { WorkerEnv } from "./routing.ts";

const groups = {
  "poudy-backend-dg": ["production", "BE"],
  "poudy-frontend-dg": ["production", "FE"],
  "poudy-backend-staging-dg": ["staging", "BE"],
  "poudy-frontend-staging-dg": ["staging", "FE"],
} as const;

const reportSchema = z
  .object({
    kind: z.literal("deployment-status"),
    eventId: z.string().regex(/^d-[A-Za-z0-9]+:(Created|Queued|InProgress|Succeeded|Failed|Stopped|LongRunning)$/),
    deploymentId: z.string().regex(/^d-[A-Za-z0-9]+$/),
    group: z.enum(Object.keys(groups) as [keyof typeof groups, ...(keyof typeof groups)[]]),
    status: z.enum(["Created", "Queued", "InProgress", "Succeeded", "Failed", "Stopped", "LongRunning"]),
    timestamp: z.iso.datetime(),
    errorCode: z.string().max(160).optional(),
    rollbackOf: z
      .string()
      .regex(/^d-[A-Za-z0-9]+$/)
      .optional(),
    test: z.boolean().optional(),
  })
  .refine((report) => report.eventId === `${report.deploymentId}:${report.status}`);

const statusNames = {
  Created: "배포 생성 확인",
  Queued: "배포 대기 확인",
  InProgress: "배포 진행 확인",
  Succeeded: "배포 성공",
  Failed: "배포 실패",
  Stopped: "배포 중단",
  LongRunning: "배포 장시간 진행",
} as const;

function embed(report: z.infer<typeof reportSchema>): DiscordEmbed {
  const [environment, component] = groups[report.group];
  const failed = report.status === "Failed" || report.status === "Stopped";
  const url = `https://ap-northeast-2.console.aws.amazon.com/codesuite/codedeploy/deployments/${report.deploymentId}?region=ap-northeast-2`;
  return {
    title: `${report.test ? "[TEST] " : ""}[${environment}][${component}] ${statusNames[report.status]}`,
    url,
    color: failed ? embedColors.red : report.status === "Succeeded" ? embedColors.green : embedColors.yellow,
    author: { name: "AWS CodeDeploy", url, icon_url: undefined },
    description: report.rollbackOf
      ? `CodeDeploy 자체 복구 배포입니다. 원본: ${report.rollbackOf}`
      : "개별 CodeDeploy 배포 결과입니다. 전체 릴리스 성공이나 CodePipeline 단계 롤백 판정과는 별개입니다.",
    fields: [
      { name: "배포 ID", value: report.deploymentId, inline: true },
      { name: "배포 그룹", value: report.group, inline: true },
      ...(report.errorCode ? [{ name: "오류 코드", value: report.errorCode, inline: false }] : []),
    ],
    footer: { text: "Poudy 배포 관측 · 60초 주기 조회" },
    timestamp: report.timestamp,
  };
}

function healthEmbed(stale: boolean): DiscordEmbed {
  const url = "https://monitoring.poudy.site/";
  return {
    title: stale ? "[Monitoring] 배포 수집기 응답 없음" : "[Monitoring] 배포 수집기 연결 회복",
    url,
    color: stale ? embedColors.red : embedColors.green,
    author: { name: "외부 생존 확인", url, icon_url: undefined },
    description: stale
      ? "15분 이상 수집기의 heartbeat를 받지 못했습니다. Monitoring 서버·수집기·연결 경로를 확인하세요. 서비스 장애로 확정한 알림은 아닙니다."
      : "수집기의 heartbeat를 다시 받았습니다. 애플리케이션 배포 복구를 의미하지 않습니다.",
    fields: [],
    footer: { text: "Cloudflare Worker 외부 감시 · 5분 주기" },
    timestamp: new Date().toISOString(),
  };
}

async function deliver(url: string, message: DiscordEmbed): Promise<Response> {
  const result = await sendDiscordEmbed(url, message);
  if (result.kind === "delivered") return new Response("Delivered");
  if (result.kind === "rate-limited") {
    return new Response("Retry delivery", {
      status: 429,
      headers: { "Retry-After": String(result.retryAfterSeconds ?? 60) },
    });
  }
  // 기존 SEO/GitHub 경로와 달리 보내는 수집기가 영속 대기열을 갖고 재시도한다.
  return new Response("Discord delivery unavailable", { status: 503 });
}

export async function handleDeployment(request: Request, env: WorkerEnv): Promise<Response> {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
  if (!env.DEPLOY_NOTIFY_TOKEN || !env.WORKFLOW_RUNS) return new Response("Not configured", { status: 503 });
  if (!(await hasValidNotifyToken(request.headers.get("Authorization"), env.DEPLOY_NOTIFY_TOKEN))) {
    return new Response("Invalid token", { status: 401 });
  }
  const storage = env.WORKFLOW_RUNS;
  if (new URL(request.url).pathname === "/deployment-heartbeat") {
    await storage.put("ops:heartbeat", String(Date.now()));
    if (await storage.get("ops:stale")) {
      if (!env.DISCORD_WEBHOOK_PRODUCTION) return new Response("Missing channel", { status: 503 });
      const response = await deliver(env.DISCORD_WEBHOOK_PRODUCTION, healthEmbed(false));
      if (!response.ok) return response;
      await storage.delete("ops:stale");
    }
    return new Response("Heartbeat accepted");
  }
  let body: unknown;
  try {
    const text = await request.text();
    if (text.length > 16_384) return new Response("Payload too large", { status: 413 });
    body = JSON.parse(text);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }
  const parsed = reportSchema.safeParse(body);
  if (!parsed.success) return new Response("Invalid deployment report", { status: 400 });
  const report = parsed.data;
  const key = `ops:delivery:${report.test ? "test:" : ""}${report.eventId}`;
  if (await storage.get(key)) return new Response("Already delivered");
  const [environment] = groups[report.group];
  const url = environment === "production" ? env.DISCORD_WEBHOOK_PRODUCTION : env.DISCORD_WEBHOOK_STAGING;
  if (!url) return new Response("Missing channel", { status: 503 });
  const response = await deliver(url, embed(report));
  if (response.ok) await storage.put(key, "delivered", { expirationTtl: 7 * 86400 });
  return response;
}

export async function checkDeploymentHeartbeat(env: WorkerEnv): Promise<void> {
  if (!env.WORKFLOW_RUNS || !env.DISCORD_WEBHOOK_PRODUCTION) return;
  const heartbeat = Number(await env.WORKFLOW_RUNS.get("ops:heartbeat"));
  // 최초 설치 전에는 경보를 만들지 않는다. 실제 heartbeat 이후부터 감시한다.
  if (!heartbeat || Date.now() - heartbeat < 15 * 60_000 || (await env.WORKFLOW_RUNS.get("ops:stale"))) return;
  const response = await deliver(env.DISCORD_WEBHOOK_PRODUCTION, healthEmbed(true));
  if (response.ok) await env.WORKFLOW_RUNS.put("ops:stale", "alerted");
}
