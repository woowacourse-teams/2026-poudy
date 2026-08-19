package com.poudy.share.domain;

import static com.poudy.product.support.ProductSensoryTestFixture.sensory;
import static org.assertj.core.api.Assertions.assertThat;

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
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

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
                new Category(1L, 100L, "토너", 1, null, null),
                new Ingredients(List.of()),
                "",
                new ProductVariants(List.of(new ProductVariant(id, 10000L, new BigDecimal("100"), "ml", "active"))),
                sensory(1, 1),
                OffsetDateTime.parse("2026-08-01T00:00:00Z"));
    }

    private static ShareMatch match(String productPhrase, Products products) {
        return SharedProductName.of(productPhrase, BRANDS).matchIn(products);
    }

    private static ShareMatch matchShared(String shared, Products products) {
        return SharedProductNames.of(new ShareText(shared), BRANDS).matchIn(products);
    }

    @Test
    @DisplayName("이름이 정확히 같은 제품 하나면 확정한다")
    void confirmsSingleExactName() {
        Products products = new Products(
                List.of(
                        product(1L, DOCTOR_G, "레드 블레미쉬 클리어 수딩 크림 EX"),
                        product(2L, DOCTOR_G, "레드 블레미쉬 클리어 수딩 토너")));

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
                        product(2L, DOCTOR_G, "핑크 시카 수딩 토너")));

        assertThat(match("메디큐브 핑크 시카 수딩 토너", products).product()).map(Product::id).contains(1L);
        assertThat(match("닥터지 핑크 시카 수딩 토너", products).product()).map(Product::id).contains(2L);
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
    @DisplayName("축약 재검색 결과가 여러 건이면 확정하지 않고 그 검색어를 돌려준다")
    void returnsShortenedKeywordForSeveralCandidates() {
        Products products = new Products(
                List.of(
                        product(1L, DOCTOR_G, "레드 블레미쉬 클리어 수딩 토너"),
                        product(2L, DOCTOR_G, "레드 블레미쉬 클리어 수딩 크림")));

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
                        product(2L, DOCTOR_G, "레드 블레미쉬 클리어 토너")));

        assertThat(match("닥터지 레드 블레미쉬 클리어 토너", products).status()).isEqualTo(ShareMatchStatus.NOT_FOUND);
    }

    @Test
    @DisplayName("제품명이 기획 낱말로 끝나면 낱말을 털어 내기 전 이름으로 확정한다")
    void confirmsNameEndingWithPlanWord() {
        Products products = new Products(
                List.of(
                        product(1L, DOCTOR_G, "어성초 크림 카밍 튜브"),
                        product(2L, DOCTOR_G, "어성초 크림 카밍 앰플")));

        ShareMatch matched = matchShared(
                "[단독] 닥터지 어성초 크림 카밍 튜브 75ml 튜브 기획 올리브영에서 다양한 뷰티 제품을 만나보세요!\nhttps://oy.run/abc",
                products);

        assertThat(matched.status()).isEqualTo(ShareMatchStatus.MATCHED);
        assertThat(matched.productId()).isEqualTo(1L);
    }

    @Test
    @DisplayName("제품명에 없는 기획 낱말은 털어 내고 확정한다")
    void confirmsAfterTrimmingPlanWord() {
        Products products = new Products(List.of(product(1L, DOCTOR_G, "블랙 스네일 토너")));

        ShareMatch matched = matchShared(
                "[단독] 닥터지 블랙 스네일 토너 기획 올리브영에서 다양한 뷰티 제품을 만나보세요!\nhttps://oy.run/abc",
                products);

        assertThat(matched.status()).isEqualTo(ShareMatchStatus.MATCHED);
        assertThat(matched.productId()).isEqualTo(1L);
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
