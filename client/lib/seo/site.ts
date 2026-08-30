const LOCAL_SITE_URL = "http://localhost:3000";

export const SITE_NAME = "Poudy";
export const SITE_ALTERNATE_NAME = "파우디";
export const SITE_TITLE = `${SITE_NAME}(${SITE_ALTERNATE_NAME}) | 화장품 전성분 검색`;
export const SITE_DESCRIPTION = `${SITE_NAME}(${SITE_ALTERNATE_NAME})에서 광고를 거치지 않고, 원하는 화장품의 전성분과 근거를 바로 확인해 보세요.`;

export const siteUrl = (): URL => new URL(process.env.NEXT_PUBLIC_SITE_URL || LOCAL_SITE_URL);

export const absoluteUrl = (path: string): string => new URL(path, siteUrl()).toString();

/** 검색 엔진에 이 배포를 내어 줄지. staging 은 운영과 내용이 같아 색인되면 순위를 나눠 갖는다. */
export const searchEnginesAllowed = (): boolean => process.env.NEXT_PUBLIC_ENVIRONMENT === "production";
