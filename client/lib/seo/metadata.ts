import type { Metadata } from "next";

import { SITE_DESCRIPTION, SITE_NAME, SITE_TITLE, searchEnginesAllowed, siteUrl } from "./site";

import { FIRST_PAGE } from "@/lib/domain/filter";

/** 네이버 서치어드바이저가 사이트 소유를 확인하는 값. 소스에 드러나도 도메인 밖에서는 쓸 수 없다. */
const NAVER_SITE_VERIFICATION = "f61dfe971733b0d1d2e8b1a8e3cda559b5b62264";

type Robots = NonNullable<Metadata["robots"]>;

/** 모든 화면이 물려받는 기본 색인 정책. 화면이 스스로 robots 를 적으면 그쪽이 이긴다. */
const defaultRobots = (): Robots => {
  if (searchEnginesAllowed()) return { index: true, follow: true };

  return { index: false, follow: false };
};

/**
 * 목록의 장마다 자기 주소를 canonical 로 둔다. 첫 장으로 모으면 검색 엔진이 뒤쪽 장과
 * 그 안의 제품 링크를 버린다. 필터 조건은 남기지 않고 장만 남긴다.
 */
export const pagedCanonical = (path: string, page: number): string => {
  if (page === FIRST_PAGE) return path;
  return `${path}?page=${page}`;
};

/** 공유 카드. 카카오톡과 X 가 같은 그림과 문구를 쓴다. */
const SHARE_IMAGE = "/opengraph-image";

/**
 * 화면마다 openGraph 를 적으면 루트 값이 통째로 바뀐다. 제목·설명·그림·주소만 다른 화면이
 * 사이트 이름과 언어를 잃지 않도록 함께 펼쳐 쓴다.
 */
export const OPEN_GRAPH_BASE = {
  type: "website",
  locale: "ko_KR",
  siteName: SITE_NAME,
} as const;

const openGraph: Metadata["openGraph"] = {
  ...OPEN_GRAPH_BASE,
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  images: [SHARE_IMAGE],
};

const twitter: Metadata["twitter"] = {
  card: "summary_large_image",
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  images: [SHARE_IMAGE],
};

const icons: Metadata["icons"] = {
  icon: [{ url: "/favicon.ico", sizes: "16x16 32x32 48x48 64x64 128x128 256x256" }],
};

/**
 * 모든 화면이 물려받는 기본값. 화면은 필요한 것만 덮어쓴다.
 *
 * 제목을 적지 않은 화면은 default 를 그대로 쓴다.
 */
export const rootMetadata = (): Metadata => ({
  metadataBase: siteUrl(),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  verification: { other: { "naver-site-verification": NAVER_SITE_VERIFICATION } },
  openGraph,
  twitter,
  robots: defaultRobots(),
  icons,
});

export const directoryPageContent = (
  kind: "brand" | "category",
  name: string,
  products: readonly { readonly name: string }[] = [],
) => {
  const names = products.slice(0, 2).map((product) => product.name);
  const examples = `${names.join(", ")}${products.length > names.length ? " 등" : ""}`;
  if (kind === "brand")
    return {
      title: `${name} 화장품의 전성분과 제품 정보를 확인해 보세요`,
      description: names.length
        ? `${name}의 ${examples} 화장품을 살펴보세요. 제품별 전성분을 확인하고 원하는 성분으로 찾아보세요.`
        : `${name}의 제품을 성분으로 살펴봅니다.`,
    };
  return {
    title: `${name} 전성분을 확인하고 원하는 화장품을 찾아보세요`,
    description: names.length
      ? `${examples} ${name} 제품을 살펴보세요. 원하는 성분은 포함하고 피하고 싶은 성분은 제외해 찾아보세요.`
      : `${name} 카테고리의 화장품과 전성분 정보를 확인해 보세요.`,
  };
};
