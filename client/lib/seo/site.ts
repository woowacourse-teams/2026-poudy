const LOCAL_SITE_URL = "http://localhost:3000";

export const SITE_NAME = "Poudy";

/** 운영 중인 인스타그램. 구조화 데이터의 sameAs 와 footer 가 함께 쓴다. */
export const INSTAGRAM_URL = "https://www.instagram.com/poudy.official";
export const SITE_ALTERNATE_NAME = "파우디";
export const SITE_TITLE = "파우디 - 원하는 성분으로 찾는 화장품";
export const SITE_DESCRIPTION =
  "궁금한 화장품의 전성분을 확인해 보세요. 원하는 성분은 포함하고 피하고 싶은 성분은 제외해 화장품을 찾아보세요.";

export const siteUrl = (): URL => new URL(process.env.NEXT_PUBLIC_SITE_URL || LOCAL_SITE_URL);

export const absoluteUrl = (path: string): string => new URL(path, siteUrl()).toString();

/** 검색 엔진에 이 배포를 내어 줄지. staging 은 운영과 내용이 같아 색인되면 순위를 나눠 갖는다. */
export const searchEnginesAllowed = (): boolean => process.env.NEXT_PUBLIC_ENVIRONMENT === "production";
