import type { Metadata } from "next";

import { SITE_DESCRIPTION, SITE_NAME, SITE_TITLE, searchEnginesAllowed, siteUrl } from "./site";

/** 네이버 서치어드바이저가 사이트 소유를 확인하는 값. 소스에 드러나도 도메인 밖에서는 쓸 수 없다. */
const NAVER_SITE_VERIFICATION = "f61dfe971733b0d1d2e8b1a8e3cda559b5b62264";

type Robots = NonNullable<Metadata["robots"]>;

/** 모든 화면이 물려받는 기본 색인 정책. 화면이 스스로 robots 를 적으면 그쪽이 이긴다. */
const defaultRobots = (): Robots => {
  if (searchEnginesAllowed()) return { index: true, follow: true };

  return { index: false, follow: false };
};

/** 공유 카드. 카카오톡과 X 가 같은 그림과 문구를 쓴다. */
const SHARE_IMAGE = "/opengraph-image";

const openGraph: Metadata["openGraph"] = {
  title: SITE_NAME,
  description: SITE_DESCRIPTION,
  type: "website",
  locale: "ko_KR",
  siteName: SITE_NAME,
  images: [SHARE_IMAGE],
};

const twitter: Metadata["twitter"] = {
  card: "summary_large_image",
  title: SITE_NAME,
  description: SITE_DESCRIPTION,
  images: [SHARE_IMAGE],
};

const icons: Metadata["icons"] = {
  icon: [
    { url: "/favicon.ico", sizes: "16x16 32x32 48x48" },
    { url: "/favicon.png", type: "image/png", sizes: "256x256" },
  ],
};

/**
 * 모든 화면이 물려받는 기본값. 화면은 필요한 것만 덮어쓴다.
 *
 * title 의 template 이 화면 제목 뒤에 서비스 이름을 붙인다. 제목을 적지 않은
 * 화면은 default 를 그대로 쓴다.
 */
export const rootMetadata = (): Metadata => ({
  metadataBase: siteUrl(),
  title: { default: SITE_TITLE, template: `%s | ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  verification: { other: { "naver-site-verification": NAVER_SITE_VERIFICATION } },
  openGraph,
  twitter,
  robots: defaultRobots(),
  icons,
});
