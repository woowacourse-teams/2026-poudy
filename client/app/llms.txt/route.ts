import { OPERATOR } from "@/components/legal/operator";
import {
  absoluteUrl,
  INSTAGRAM_URL,
  searchEnginesAllowed,
  SITE_ALTERNATE_NAME,
  SITE_NAME,
  siteUrl,
} from "@/lib/seo/site";

export const dynamic = "force-dynamic";

export function GET(): Response {
  if (!searchEnginesAllowed()) {
    return new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });
  }

  const body = `# ${SITE_ALTERNATE_NAME} (${SITE_NAME})

> 파우디는 화장품을 고를 때 기준을 세우는 과정을 돕는 서비스입니다. 사용자가 여러 곳에서 정보를 찾아다니는 수고를 줄이고, 브랜드 광고나 홍보성 리뷰의 영향을 덜 받으며 화장품을 판단할 수 있도록 돕는 것을 지향합니다.

현재는 화장품 전성분과 성분 정보를 제공합니다. 카테고리·브랜드별로 제품을 살펴보거나, 제품명·브랜드 검색과 성분 포함·제외 조건으로 화장품을 찾을 수 있습니다. 관심 있는 제품은 저장함에 모아둘 수 있으며, 큐레이션에서는 주제별로 소개한 제품을 살펴볼 수 있습니다.

서비스의 대표 도메인은 ${siteUrl().origin}이며, 기본 언어는 한국어(ko-KR)입니다.
문서 검토일: 2026-09-28. 이 날짜는 이 안내 문서를 검토한 날짜이며, 개별 제품·성분 정보를 갱신한 날짜는 아닙니다.

제품 상세 페이지(/products/{id})에서는 등록된 전성분과 용량별 가격을 확인하고, 개별 성분의 상세 정보로 이동할 수 있습니다.
성분 상세 페이지(/ingredients/{id})에서는 한글·영문 이름, 배합 목적, 설명, 정보 출처와 업데이트 날짜를 확인할 수 있습니다.
큐레이션 상세 페이지(/curations/{id})에서는 주제에 맞춰 소개한 제품을 살펴볼 수 있으며, 홈 배너에 노출되는 큐레이션은 페이지 사이트맵에서 찾을 수 있습니다.

성분 포함 여부는 파우디에 등록된 전성분표를 기준으로 하며, 제품이 리뉴얼되면 실제 제품의 표기와 다를 수 있습니다.
가격은 등록된 제품 옵션의 가격이며, 판매처의 실판매 최저가를 뜻하지 않습니다.
성분 설명은 일반적인 참고 정보이며, 개인의 피부 반응이나 제품의 실제 사용감을 보장하지 않습니다.
인용할 때는 해당 상세 페이지의 주소와 화면에 표시된 출처·업데이트 날짜를 함께 확인해 주세요.
성분 정보의 출처와 업데이트 날짜는 각 상세 페이지에서 확인할 수 있습니다.

이 문서는 서비스와 공개 정보의 이용 방법을 안내하며, 크롤러의 접근 허용·차단 규칙은 robots.txt에서 확인할 수 있습니다.
운영 사이트는 공개 페이지의 수집을 허용하고 API·조건별 제품 목록·공유 리다이렉트 경로의 접근은 제한하지만, 조건별 제품 목록에는 일부 허용 예외가 있습니다.
제품 정보의 수정 제안은 해당 제품 상세 페이지에서 시작할 수 있습니다.

## 주요 페이지

- [홈](${absoluteUrl("/")}): 큐레이션, 인기 제품과 검색어, 피부 타입별 제품을 탐색할 수 있습니다.
- [카테고리](${absoluteUrl("/categories")}): 카테고리별 제품 목록과 상세 정보로 이동할 수 있습니다.
- [브랜드](${absoluteUrl("/brands")}): 브랜드별 제품 목록과 상세 정보로 이동할 수 있습니다.
- [제품 검색](${absoluteUrl("/search/products")}): 제품명이나 브랜드로 화장품을 검색하고 전성분을 확인할 수 있습니다.
- [성분 검색](${absoluteUrl("/search/ingredients")}): 포함하거나 제외할 성분을 선택해 조건에 맞는 화장품을 찾을 수 있습니다.
- [저장함](${absoluteUrl("/saved")}): 사용자가 저장한 화장품을 모아 확인할 수 있습니다.

## 사이트맵

- [사이트맵](${absoluteUrl("/sitemap.xml")}): 페이지·제품·성분 사이트맵의 목록입니다.
- [페이지 사이트맵](${absoluteUrl("/sitemap-pages.xml")}): 카테고리·브랜드·홈 배너 큐레이션 등의 주소를 제공합니다.
- [제품 사이트맵](${absoluteUrl("/sitemap-products.xml")}): 제품 상세 주소를 제공합니다.
- [성분 사이트맵](${absoluteUrl("/sitemap-ingredients.xml")}): 제품에 사용된 성분의 상세 주소를 제공합니다.

## 크롤러 접근 정책

- [robots.txt](${absoluteUrl("/robots.txt")}): 크롤러의 접근 허용·차단 규칙과 예외를 확인할 수 있습니다.

## 공식 연락처와 채널

- [문의하기](${absoluteUrl("/inquiry")}): 서비스에 관한 문의를 보낼 수 있습니다.
- [공식 이메일](mailto:${OPERATOR.officer.email}): 서비스 문의와 정보 수정 제안을 보낼 수 있습니다.
- [공식 Instagram](${INSTAGRAM_URL}): 파우디의 공식 소식을 확인할 수 있습니다.
`;

  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
