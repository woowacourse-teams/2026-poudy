import type { AppInfo, AppPlatform, AppProperties, WebInfo } from "@/lib/types/app-info";

const PLATFORMS: readonly AppPlatform[] = ["ios", "android"];
const TEXTS = ["app_version", "os_version", "device_model"] as const;
const WEB: WebInfo = { is_app: false };

const isAppInfo = (value: unknown): value is AppInfo => {
  if (typeof value !== "object" || value === null) return false;

  const candidate = value as Record<string, unknown>;
  return (
    candidate.is_app === true &&
    PLATFORMS.some((platform) => platform === candidate.platform) &&
    TEXTS.every((name) => typeof candidate[name] === "string" && candidate[name] !== "")
  );
};

export const readAppInfo = (value: unknown): AppProperties => {
  if (!isAppInfo(value)) return WEB;

  return {
    is_app: true,
    platform: value.platform,
    app_version: value.app_version,
    os_version: value.os_version,
    device_model: value.device_model,
  };
};
