const LOCAL_SITE_URL = "http://localhost:3000";

export const SITE_DESCRIPTION =
  "Poudy에서 화장품 전성분을 확인하고, 원하는 성분은 포함하고 피하고 싶은 성분은 제외해 나에게 맞는 제품을 찾아보세요.";

export const siteUrl = (): URL => new URL(process.env.NEXT_PUBLIC_SITE_URL || LOCAL_SITE_URL);

export const absoluteUrl = (path: string): string => new URL(path, siteUrl()).toString();

export const indexingEnabled = (): boolean => process.env.NEXT_PUBLIC_ENVIRONMENT === "production";
