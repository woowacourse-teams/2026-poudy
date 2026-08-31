package com.poudy.share.domain;

import static com.poudy.product.support.ProductSensoryTestFixture.sensory;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.poudy.brand.domain.Brand;
import com.poudy.brand.domain.Brands;
import com.poudy.category.domain.Category;
import com.poudy.ingredient.domain.Ingredients;
import com.poudy.product.domain.Product;
import com.poudy.product.domain.ProductVariant;
import com.poudy.product.domain.ProductVariants;
import com.poudy.product.domain.Products;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Stream;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

@DisplayName("공유 텍스트 제품 확정")
class ShareMatchTest {

    private static final Brand DOCTOR_G = new Brand(1L, "닥터지", null, null);
    private static final Brand MEDICUBE = new Brand(2L, "메디큐브", null, null);
    private static final Brands BRANDS = new Brands(List.of(DOCTOR_G, MEDICUBE));

    private static Product product(Long id, Brand brand, String name) {
        return new Product(
            id,
            name,
            brand,
            new Category(1L, 100L, "토너", 1),
            new Ingredients(List.of()),
            "",
            new ProductVariants(List.of(new ProductVariant(id, 10000L, new BigDecimal("100"), "ml", "active"))),
            sensory(1, 1),
            OffsetDateTime.parse("2026-08-01T00:00:00Z")
        );
    }

    private static ShareMatch match(String productPhrase, Products products) {
        return SharedProductName.of(productPhrase, BRANDS).matchIn(products);
    }

    private static ShareMatch matchShared(String shared, Products products) {
        return SharedProductNames.of(new ShareText(shared), BRANDS).matchIn(products);
    }

    private static Stream<Arguments> sameProductPackageListings() {
        return Stream.of(
            Arguments.of(
                "셀퓨전씨 토너 단품",
                "셀퓨전씨",
                "PH 컨디션 토너",
                "[각질케어/청정피부] 셀퓨전씨 트리악 pH 컨디션 토너 200ml"
            ),
            Arguments.of(
                "아이소이 토너 단품",
                "아이소이",
                "모이스춰 닥터 토너",
                "[100시간/보습지속] 아이소이 모이스춰닥터 장수진 수분토너 130ml"
            ),
            Arguments.of(
                "아누아 세럼 2입 기획",
                "아누아",
                "복숭아 70 나이아신 세럼",
                "[단독기획] 아누아 복숭아 70 나이아신아마이드 세럼 30ml 2입"
            ),
            Arguments.of(
                "리쥬란 토너 단품",
                "리쥬란",
                "모이스처 트리트먼트 토너",
                "[각질개선율191%]리쥬란 더마 힐러 모이스처 트리트먼트 토너 150ml"
            ),
            Arguments.of(
                "리쥬란 앰플 본품",
                "리쥬란",
                "트리플 래디언스 앰플",
                "[색소노화안티에이징/c-PDRN 브라이트닝] 리쥬란 힐러 트리플 래디언스 앰플 30ml"
            ),
            Arguments.of(
                "리쥬란 앰플 더블 기획",
                "리쥬란",
                "트리플 래디언스 앰플",
                "[c-PDRN 브라이트닝/수량한정]리쥬란 힐러 트리플 래디언스 앰플 10ml 더블 기획(+5ml+1ml*3)"
            ),
            Arguments.of(
                "리쥬란 유스 앰플 기획",
                "리쥬란",
                "유스 포뮬러 앰플",
                "리쥬란 바이옴 힐러 유스포뮬러 앰플 30ml기획 (+더마힐러 앰플1ml*7+더마힐러 크림10g)"
            ),
            Arguments.of(
                "리쥬란 유스 크림 단품",
                "리쥬란",
                "유스 포뮬러 크림",
                "[c-PDRN 기미크림/광노화케어 신소재] 리쥬란 바이옴 힐러 유스 포뮬러 크림 50ml"
            ),
            Arguments.of(
                "아비브 부활초 마스크 20매",
                "아비브",
                "약산성 시트 마스크 부활초 핏",
                "아비브 약산성 pH시트 마스크 부활초 핏 20매"
            ),
            Arguments.of(
                "아비브 어성초 마스크 20매",
                "아비브",
                "약산성 시트 마스크 어성초 핏",
                "아비브 약산성 pH시트 마스크 어성초 핏 20매"
            ),
            Arguments.of(
                "아누아 어성초 토너 더블 기획",
                "아누아",
                "어성초 77 히알루론산 수분 진정 토너",
                "아누아 어성초 77 히알루론 수분 진정 토너 250ml 더블 기획"
            ),
            Arguments.of(
                "차앤박 PDRN 앰플 더블 기획",
                "차앤박",
                "더마앤서 액티브 부스트 앰플",
                "[탄력콜라겐UP/1+1] 차앤박 더마앤서 액티브 부스트 PDRN 앰플 30ml 더블기획"
            ),
            Arguments.of(
                "차앤박 프로폴리스 크림 2입",
                "차앤박",
                "프로폴리스 앰플 샷 크림",
                "[광채크림/NEW대용량] 차앤박 프로폴리스 앰플 액티브 샷 크림 75ml 2입"
            ),
            Arguments.of(
                "비플레인 선크림 1+1 기획",
                "비플레인",
                "선뮤즈 톤업&코렉팅 선크림 SPF50+ PA++++",
                "[촉촉보라톤업/혼합자차] 비플레인 선뮤즈 톤업 앤 코렉팅 선크림 50ml 1+1 기획"
            ),
            Arguments.of(
                "라로슈포제 K 플러스 토너",
                "라로슈포제",
                "에빠끌라 K+ 토너",
                "라로슈포제 에빠끌라 K(+) 토너 200ml (지성 피부)"
            ),
            Arguments.of(
                "달바 블루 톤업 선크림",
                "달바",
                "워터풀 톤업 선크림 블루 SPF50+ PA++++",
                "[산뜻&투명톤업] 달바 워터풀 블루 톤업 선크림 50ml"
            ),
            Arguments.of(
                "이니스프리 그린티 수분 세럼",
                "이니스프리",
                "그린티 히알루론산 수분 세럼",
                "[수분/보습] 이니스프리 그린티 씨드 히알루론산 수분 세럼 80ml 기획 (+25ml)"
            ),
            Arguments.of(
                "이니스프리 그린티 수분크림 더블 기획",
                "이니스프리",
                "그린티 히알루론산 수분크림",
                "[1+1/화잘먹] 이니스프리 그린티 수분크림 50ml 더블기획"
            ),
            Arguments.of(
                "이니스프리 그린티 씨드 수분크림",
                "이니스프리",
                "그린티 히알루론산 수분크림",
                "이니스프리 그린티 씨드 히알루론산 크림 50ml 기획(+20ml)"
            ),
            Arguments.of(
                "달바 비타 캡슐 크림 단품",
                "달바",
                "비타 토닝 캡슐 크림 나이아신아마이드 5퍼센트",
                "[26년 신형] 달바 비타 캡슐 크림 나이아신아마이드 5퍼센트 55g"
            ),
            Arguments.of(
                "달바 비타 캡슐 크림 기획",
                "달바",
                "비타 토닝 캡슐 크림 나이아신아마이드 5퍼센트",
                "[26년 신형/미니크림 증정] 달바 비타 캡슐 크림 나이아신아마이드 5퍼센트 55g 기획 (+10g)"
            )
        );
    }

    @Test
    @DisplayName("이름이 정확히 같은 제품 하나면 확정한다")
    void confirmsSingleExactName() {
        Products products = new Products(
            List.of(
                product(1L, DOCTOR_G, "레드 블레미쉬 클리어 수딩 크림 EX"),
                product(2L, DOCTOR_G, "레드 블레미쉬 클리어 수딩 토너")
            )
        );

        ShareMatch matched = match("닥터지 레드 블레미쉬 클리어 수딩크림 EX", products);

        assertThat(matched.status()).isEqualTo(ShareMatchStatus.MATCHED);
        assertThat(matched.productId()).isEqualTo(1L);
    }

    @Test
    @DisplayName("후보가 하나뿐이면 이름이 정확히 같지 않아도 확정한다")
    void confirmsSingleCandidate() {
        Products products = new Products(List.of(product(1L, MEDICUBE, "PDRN 핑크 시카 수딩 토너 플러스")));

        ShareMatch matched = match("메디큐브 PDRN 핑크 시카 수딩 토너", products);

        assertThat(matched.productId()).isEqualTo(1L);
    }

    @Test
    @DisplayName("브랜드를 알아냈으면 다른 브랜드 제품은 후보에서 뺀다")
    void keepsCandidatesInSharedBrand() {
        Products products = new Products(
            List.of(
                product(1L, MEDICUBE, "핑크 시카 수딩 토너"),
                product(2L, DOCTOR_G, "핑크 시카 수딩 토너")
            )
        );

        assertThat(match("메디큐브 핑크 시카 수딩 토너", products).product()).map(Product::id).contains(1L);
        assertThat(match("닥터지 핑크 시카 수딩 토너", products).product()).map(Product::id).contains(2L);
    }

    @Test
    @DisplayName("제품명 자리에 남은 브랜드명만으로 제품을 확정하지 않는다")
    void doesNotConfirmByBrandNameInProductNamePosition() {
        Products products = new Products(List.of(product(1L, DOCTOR_G, "레드 블레미쉬 클리어 토너")));

        assertThat(match("닥터지 닥터지", products).status()).isEqualTo(ShareMatchStatus.NOT_FOUND);
    }

    @Test
    @DisplayName("축약한 검색어로는 확정하지 않는다")
    void doesNotConfirmFromShortenedKeyword() {
        Products products = new Products(List.of(product(7L, DOCTOR_G, "블랙스네일 레티놀 콜라겐 세럼 인텐스")));

        ShareMatch matched = match("닥터지 블랙스네일 레티놀 콜라겐 마스크", products);

        assertThat(matched.status()).isEqualTo(ShareMatchStatus.NOT_FOUND);
        assertThat(matched.keyword()).isEqualTo("블랙스네일 레티놀 콜라겐");
    }

    @Test
    @DisplayName("카탈로그에 없는 형제 제품을 공유해도 확정하지 않는다")
    void doesNotConfirmAbsentSiblingProduct() {
        Products products = new Products(List.of(product(1L, DOCTOR_G, "블랙 스네일 토너")));

        assertThat(match("닥터지 블랙 스네일 토너 라이트", products).status()).isEqualTo(ShareMatchStatus.NOT_FOUND);
    }

    @Test
    @DisplayName("앞에 새 라인명이 붙어도 브랜드 안의 고유한 핵심 제품명으로 확정한다")
    void confirmsUniqueContainedProductName() {
        Products products = new Products(
            List.of(
                product(1L, DOCTOR_G, "블랙 스네일 토너"),
                product(2L, DOCTOR_G, "블랙 스네일 크림")
            )
        );

        ShareMatch matched = match("닥터지 로얄 블랙 스네일 토너", products);

        assertThat(matched.productId()).isEqualTo(1L);
    }

    @Test
    @DisplayName("핵심 제품명을 포함한 같은 브랜드 제품이 여럿이면 확정하지 않는다")
    void doesNotConfirmAmbiguousContainedProductName() {
        Products products = new Products(
            List.of(
                product(1L, DOCTOR_G, "로얄 블랙 스네일 토너"),
                product(2L, DOCTOR_G, "프레스티지 블랙 스네일 토너")
            )
        );

        assertThat(match("닥터지 프레스티지 로얄 블랙 스네일 토너", products).status())
            .isEqualTo(ShareMatchStatus.NOT_FOUND);
    }

    @Test
    @DisplayName("안전 조건을 통과한 후보 중 이름 점수가 명확히 높으면 확정한다")
    void confirmsCandidateWithClearSimilarityAdvantage() {
        Brand brand = new Brand(100L, "비플레인", null, null);
        Products products = new Products(
            List.of(
                product(1L, brand, "선뮤즈 톤업&코렉팅 선크림 SPF50+ PA++++"),
                product(2L, brand, "선뮤즈 톤업&코렉팅 매트 선크림 SPF50+ PA++++")
            )
        );

        ShareMatch matched = SharedProductName.of(
            "비플레인 선뮤즈 톤업 앤 코렉팅 선크림",
            new Brands(List.of(brand))
        ).matchIn(products);

        assertThat(matched.productId()).isEqualTo(1L);
    }

    @Test
    @DisplayName("pH 표기 유무는 제품 이름 비교에서 무시한다")
    void ignoresPhMarkerForSimilarity() {
        Brand brand = new Brand(100L, "아비브", null, null);
        Products products = new Products(
            List.of(
                product(1L, brand, "약산성 시트 마스크 부활초 핏"),
                product(2L, brand, "약산성 시트 마스크 어성초 핏")
            )
        );

        ShareMatch matched = SharedProductName.of(
            "아비브 약산성 pH시트 마스크 부활초 핏",
            new Brands(List.of(brand))
        ).matchIn(products);

        assertThat(matched.productId()).isEqualTo(1L);
    }

    @Test
    @DisplayName("용도 표현에 형태 낱말이 있어도 마지막 제품 형태가 같으면 비교한다")
    void comparesLastProductForm() {
        Brand brand = new Brand(100L, "이니스프리", null, null);
        Products products = new Products(
            List.of(
                product(1L, brand, "레티놀 PDRN 스킨부스터 앰플"),
                product(2L, brand, "레티놀 시카 모공 흔적 앰플")
            )
        );

        ShareMatch matched = SharedProductName.of(
            "이니스프리 레티놀 그린티 PDRN 앰플",
            new Brands(List.of(brand))
        ).matchIn(products);

        assertThat(matched.productId()).isEqualTo(1L);
    }

    @Test
    @DisplayName("여러 제품 형태가 연결자로 묶인 세트는 비슷한 단일 제품으로 확정하지 않는다")
    void doesNotConfirmConnectedProductForms() {
        Products products = new Products(List.of(product(1L, DOCTOR_G, "블랙 스네일 크림")));

        ShareMatch matched = match("닥터지 블랙 스네일 토너&크림", products);

        assertThat(matched.status()).isEqualTo(ShareMatchStatus.NOT_FOUND);
    }

    @Test
    @DisplayName("가장 비슷한 후보들의 점수 차이가 작으면 확정하지 않는다")
    void doesNotConfirmCandidatesWithSmallSimilarityAdvantage() {
        Brand brand = new Brand(100L, "이니스프리", null, null);
        Products products = new Products(
            List.of(
                product(1L, brand, "그린티 히알루론산 수분 세럼"),
                product(2L, brand, "그린티 씨드 히알루론산 세럼")
            )
        );

        ShareMatch matched = SharedProductName.of(
            "이니스프리 그린티 씨드 히알루론산 수분 세럼",
            new Brands(List.of(brand))
        ).matchIn(products);

        assertThat(matched.status()).isEqualTo(ShareMatchStatus.NOT_FOUND);
    }

    @Test
    @DisplayName("일반 패키지는 소용량 표식이 붙은 별도 후보와 구분한다")
    void distinguishesSmallPackageScope() {
        Brand brand = new Brand(100L, "이니스프리", null, null);
        Products products = new Products(
            List.of(
                product(1L, brand, "그린티 히알루론산 수분크림"),
                product(2L, brand, "[소용량] 그린티 히알루론산 수분크림")
            )
        );

        ShareMatch matched = SharedProductName.of(
            "이니스프리 그린티 수분크림",
            new Brands(List.of(brand))
        ).matchIn(products);

        assertThat(matched.productId()).isEqualTo(1L);
    }

    @Test
    @DisplayName("공통 낱말 점수가 명확히 높은 제품을 글자 배열이 비슷한 후보보다 우선한다")
    void confirmsCandidateWithClearTokenAdvantage() {
        Brand brand = new Brand(100L, "이니스프리", null, null);
        Products products = new Products(
            List.of(
                product(1L, brand, "그린티 히알루론산 수분크림"),
                product(2L, brand, "그린티 판테놀 수분 젤 크림")
            )
        );

        ShareMatch matched = SharedProductName.of(
            "이니스프리 그린티 수분크림",
            new Brands(List.of(brand))
        ).matchIn(products);

        assertThat(matched.productId()).isEqualTo(1L);
    }

    @Test
    @DisplayName("사용 부위가 추가된 형제 제품은 핵심 이름이 같아도 확정하지 않는다")
    void doesNotConfirmContainedNameWithDifferentScope() {
        Products products = new Products(List.of(product(1L, DOCTOR_G, "블랙 스네일 토너")));

        assertThat(match("닥터지 포맨 블랙 스네일 토너", products).status()).isEqualTo(ShareMatchStatus.NOT_FOUND);
    }

    @Test
    @DisplayName("제품 형태가 추가된 형제 제품은 핵심 이름이 같아도 확정하지 않는다")
    void doesNotConfirmContainedNameWithDifferentForm() {
        Products products = new Products(List.of(product(1L, DOCTOR_G, "블랙 스네일 토너")));

        assertThat(match("닥터지 블랙 스네일 토너 마스크", products).status()).isEqualTo(ShareMatchStatus.NOT_FOUND);
    }

    @Test
    @DisplayName("NEW 표식이 있는 공유는 성분이 다른 이전 제품보다 새 제품을 확정한다")
    void confirmsNewProductBeforePreviousVersion() {
        Brand brand = new Brand(100L, "토리든", null, null);
        Products products = new Products(
            List.of(
                product(203L, brand, "다이브인 저분자 히알루론산 토너"),
                product(539L, brand, "[NEW] 다이브인 저분자 히알루론산 토너")
            )
        );
        String shared = "[NEW] 토리든 다이브인 저분자 히알루론산 토너 300ml 기획" +
            " 올리브영에서 다양한 뷰티 제품을 만나보세요! https://oy.run/abc";

        ShareMatch matched = SharedProductNames.of(new ShareText(shared), new Brands(List.of(brand))).matchIn(products);

        assertThat(matched.status()).isEqualTo(ShareMatchStatus.MATCHED);
        assertThat(matched.productId()).isEqualTo(539L);
    }

    @Test
    @DisplayName("카탈로그에 새 버전이 없으면 NEW 표식을 제외하고 기존 제품을 찾는다")
    void fallsBackFromUnknownNewProductMarker() {
        Brand brand = new Brand(100L, "닥터지", null, null);
        Products products = new Products(List.of(product(9L, brand, "비타 클리어 글루타샷 흔적 크림")));
        String shared = "[NEW/흔적토닝] 닥터지 비타 클리어 글루타샷 흔적 크림 50ml" +
            " 올리브영에서 다양한 뷰티 제품을 만나보세요! https://oy.run/abc";

        ShareMatch matched = SharedProductNames.of(new ShareText(shared), new Brands(List.of(brand))).matchIn(products);

        assertThat(matched.status()).isEqualTo(ShareMatchStatus.MATCHED);
        assertThat(matched.productId()).isEqualTo(9L);
    }

    @Test
    @DisplayName("새 버전 후보가 모호하면 이전 제품으로 내려가 확정하지 않는다")
    void doesNotFallBackFromAmbiguousNewProduct() {
        Brand brand = new Brand(100L, "토리든", null, null);
        Products products = new Products(
            List.of(
                product(203L, brand, "다이브인 저분자 히알루론산 크림"),
                product(541L, brand, "[NEW] 다이브인 저분자 히알루론산 크림 라이트"),
                product(542L, brand, "[NEW] 다이브인 저분자 히알루론산 크림 리치")
            )
        );
        String shared = "[NEW] 토리든 다이브인 저분자 히알루론산 크림 100ml" +
            " 올리브영에서 다양한 뷰티 제품을 만나보세요! https://oy.run/abc";

        ShareMatch matched = SharedProductNames.of(new ShareText(shared), new Brands(List.of(brand))).matchIn(products);

        assertThat(matched.status()).isEqualTo(ShareMatchStatus.NOT_FOUND);
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("sameProductPackageListings")
    @DisplayName("다른 패키지 이름도 같은 카탈로그 제품으로 확정한다")
    void confirmsSameProductInDifferentPackages(
        String description,
        String brandName,
        String canonicalName,
        String listingName
    ) {
        Brand brand = new Brand(100L, brandName, null, null);
        Products products = new Products(
            List.of(product(1L, brand, canonicalName), product(2L, brand, canonicalName + " 라이트"))
        );
        String shared = listingName + " 올리브영에서 다양한 뷰티 제품을 만나보세요!\nhttps://oy.run/abc";

        ShareMatch matched = SharedProductNames.of(new ShareText(shared), new Brands(List.of(brand))).matchIn(products);

        assertThat(matched.status()).isEqualTo(ShareMatchStatus.MATCHED);
        assertThat(matched.productId()).isEqualTo(1L);
    }

    @Test
    @DisplayName("비슷한 카탈로그 이름이 중복이면 제품을 확정하지 않는다")
    void doesNotConfirmDuplicatedSimilarTarget() {
        Brand brand = new Brand(100L, "셀퓨전씨", null, null);
        Products products = new Products(
            List.of(product(1L, brand, "PH 컨디션 토너"), product(2L, brand, "PH 컨디션 토너"))
        );

        ShareMatch matched = SharedProductName.of(
            "셀퓨전씨 트리악 pH 컨디션 토너",
            new Brands(List.of(brand))
        ).matchIn(products);

        assertThat(matched.status()).isEqualTo(ShareMatchStatus.NOT_FOUND);
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("differentVersionListings")
    @DisplayName("핵심 이름이 비슷해도 다른 버전의 제품은 확정하지 않는다")
    void doesNotConfirmDifferentVersion(
        String description,
        String brandName,
        String canonicalName,
        String listingName
    ) {
        Brand brand = new Brand(100L, brandName, null, null);
        Products products = new Products(List.of(product(1L, brand, canonicalName)));
        String shared = listingName + " 올리브영에서 다양한 뷰티 제품을 만나보세요!\nhttps://oy.run/abc";

        ShareMatch matched = SharedProductNames.of(new ShareText(shared), new Brands(List.of(brand))).matchIn(products);

        assertThat(matched.status()).isEqualTo(ShareMatchStatus.NOT_FOUND);
    }

    private static Stream<Arguments> differentVersionListings() {
        return Stream.of(
            Arguments.of(
                "히알루 플러스 세럼",
                "바이오더마",
                "하이드라비오 세럼",
                "바이오더마 하이드라비오 히알루+ 세럼 30ml"
            ),
            Arguments.of(
                "히알루 플러스 세럼의 기본형",
                "바이오더마",
                "하이드라비오 히알루+ 세럼",
                "바이오더마 하이드라비오 세럼 30ml"
            ),
            Arguments.of(
                "밤 B5 플러스와 멀티 리페어 크림 묶음",
                "라로슈포제",
                "시카플라스트 멀티 리페어 크림 B5",
                "[온라인단독/한정수량]라로슈포제 시카플라스트 밤B5+& 멀티리페어 크림 B5 100ml 기획"
            )
        );
    }

    @Test
    @DisplayName("축약 재검색 결과가 여러 건이면 확정하지 않고 그 검색어를 돌려준다")
    void returnsShortenedKeywordForSeveralCandidates() {
        Products products = new Products(
            List.of(
                product(1L, DOCTOR_G, "레드 블레미쉬 클리어 수딩 토너"),
                product(2L, DOCTOR_G, "레드 블레미쉬 클리어 수딩 크림")
            )
        );

        ShareMatch matched = match("닥터지 레드 블레미쉬 클리어 히알 시카 수딩 세럼", products);

        assertThat(matched.status()).isEqualTo(ShareMatchStatus.NOT_FOUND);
        assertThat(matched.productId()).isNull();
        assertThat(matched.keyword()).isEqualTo("레드 블레미쉬 클리어");
    }

    @Test
    @DisplayName("이름이 정확히 같은 제품이 여럿이면 확정하지 않는다")
    void doesNotConfirmSeveralExactNames() {
        Products products = new Products(
            List.of(
                product(1L, DOCTOR_G, "레드 블레미쉬 클리어 토너"),
                product(2L, DOCTOR_G, "레드 블레미쉬 클리어 토너")
            )
        );

        assertThat(match("닥터지 레드 블레미쉬 클리어 토너", products).status()).isEqualTo(ShareMatchStatus.NOT_FOUND);
    }

    @Test
    @DisplayName("제품명이 기획 낱말로 끝나면 낱말을 털어 내기 전 이름으로 확정한다")
    void confirmsNameEndingWithPlanWord() {
        Products products = new Products(
            List.of(
                product(1L, DOCTOR_G, "어성초 크림 카밍 튜브"),
                product(2L, DOCTOR_G, "어성초 크림 카밍 앰플")
            )
        );

        ShareMatch matched = matchShared(
            "[단독] 닥터지 어성초 크림 카밍 튜브 75ml 튜브 기획 올리브영에서 다양한 뷰티 제품을 만나보세요!\nhttps://oy.run/abc",
            products
        );

        assertThat(matched.status()).isEqualTo(ShareMatchStatus.MATCHED);
        assertThat(matched.productId()).isEqualTo(1L);
    }

    @Test
    @DisplayName("제품명에 없는 기획 낱말은 털어 내고 확정한다")
    void confirmsAfterTrimmingPlanWord() {
        Products products = new Products(List.of(product(1L, DOCTOR_G, "블랙 스네일 토너")));

        ShareMatch matched = matchShared(
            "[단독] 닥터지 블랙 스네일 토너 기획 올리브영에서 다양한 뷰티 제품을 만나보세요!\nhttps://oy.run/abc",
            products
        );

        assertThat(matched.status()).isEqualTo(ShareMatchStatus.MATCHED);
        assertThat(matched.productId()).isEqualTo(1L);
    }

    @Test
    @DisplayName("확정 여부와 제품이 어긋나는 결과는 만들 수 없다")
    void rejectsInconsistentResult() {
        Product product = product(1L, DOCTOR_G, "레드 블레미쉬 클리어 토너");

        assertThatThrownBy(() -> new ShareMatch(ShareMatchStatus.MATCHED, Optional.empty(), ""))
            .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new ShareMatch(ShareMatchStatus.NOT_FOUND, Optional.of(product), "토너"))
            .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("끝내 찾지 못하면 정제한 검색어를 돌려준다")
    void returnsCleanedKeywordWhenNothingMatches() {
        Products products = new Products(List.of(product(1L, MEDICUBE, "PDRN 핑크 시카 수딩 토너")));

        ShareMatch matched = match("닥터지 브라이트닝 필링젤", products);

        assertThat(matched.status()).isEqualTo(ShareMatchStatus.NOT_FOUND);
        assertThat(matched.keyword()).isEqualTo("브라이트닝 필링젤");
    }
}
