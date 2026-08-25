const LOCAL_SITE_URL = "http://localhost:3000";

export const siteUrl = (): URL => new URL(process.env.NEXT_PUBLIC_SITE_URL || LOCAL_SITE_URL);

export const absoluteUrl = (path: string): string => new URL(path, siteUrl()).toString();

export const indexingEnabled = (): boolean => process.env.NEXT_PUBLIC_ENVIRONMENT === "production";
