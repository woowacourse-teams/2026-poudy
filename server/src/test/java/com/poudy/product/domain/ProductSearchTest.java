package com.poudy.product.domain;

import static com.poudy.product.support.ProductSensoryTestFixture.sensory;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.poudy.brand.domain.Brand;
import com.poudy.category.domain.Category;
import com.poudy.ingredient.domain.Ingredients;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("제품 검색과 검색 제안 페이지")
class ProductSearchTest {

    private static Product product(Long id, String name) {
        return product(id, name, new Brand(1L, "브랜드", null, null));
    }

    private static Product product(Long id, String name, Brand brand) {
        Category category = new Category(1L, 100L, "카테고리", 1);

        ProductVariant variant = new ProductVariant(id, 10000L, new BigDecimal("100"), "ml", "active");

        return new Product(
            id,
            name,
            brand,
            category,
            new Ingredients(List.of()),
            "https://example.com/" + id + ".png",
            new ProductVariants(List.of(variant)),
            sensory(1, 1),
            OffsetDateTime.parse("2026-08-01T00:00:00Z")
        );
    }

    private static List<String> names(List<Product> products) {
        return products.stream()
            .map(Product::name)
            .toList();
    }

    private static List<String> matchedNames(List<MatchedProduct> products) {
        return products.stream()
            .map(MatchedProduct::product)
            .map(Product::name)
            .toList();
    }

    @Test
    @DisplayName("제품명을 부분 일치시킨다")
    void findsByPartialName() {
        Products products = new Products(List.of(product(1L, "블랙 스네일 토너"), product(2L, "수분 크림")));

        assertThat(names(products.search("토너"))).containsExactly("블랙 스네일 토너");
    }

    @Test
    @DisplayName("브랜드명이 걸리면 그 브랜드의 제품을 반환한다")
    void findsProductsByBrandName() {
        Brand roundLab = new Brand(1L, "라운드랩", null, null);
        Brand torriden = new Brand(2L, "토리든", null, null);
        Products products = new Products(
            List.of(
                product(1L, "1025 독도 토너", roundLab),
                product(2L, "자작나무 수분 크림", roundLab),
                product(3L, "다이브인 세럼", torriden)
            )
        );

        assertThat(names(products.search("라운드")))
            .containsExactly("1025 독도 토너", "자작나무 수분 크림");
    }

    @Test
    @DisplayName("브랜드 영문명으로 제품을 찾는다")
    void findsProductsByEnglishBrandName() {
        Brand brand = new Brand(1L, "닥터지", "Dr.G", null);
        Products products = new Products(List.of(product(1L, "레드 블레미쉬 크림", brand)));

        assertThat(names(products.search("dr.g"))).containsExactly("레드 블레미쉬 크림");
    }

    @Test
    @DisplayName("브랜드명도 공백을 지우고 초성으로 맞춘다")
    void normalizesBrandName() {
        Brand brand = new Brand(1L, "다 브랜드", null, null);
        Products products = new Products(List.of(product(1L, "블랙 스네일 토너", brand)));

        assertThat(names(products.search("다브랜드"))).containsExactly("블랙 스네일 토너");
        assertThat(names(products.search("ㄷㅂㄹㄷ"))).containsExactly("블랙 스네일 토너");
    }

    @Test
    @DisplayName("브랜드명과 제품명에 나뉘어 일치하는 제품을 찾는다")
    void findsByBrandAndProductName() {
        Brand roundLab = new Brand(1L, "라운드랩", null, null);
        Brand torriden = new Brand(2L, "토리든", null, null);
        Products products = new Products(
            List.of(
                product(1L, "1025 독도 토너", roundLab),
                product(2L, "자작나무 수분 크림", roundLab),
                product(3L, "다이브인 저분자 히알루론산 토너", torriden)
            )
        );

        assertThat(names(products.search("라운드랩 독도"))).containsExactly("1025 독도 토너");
    }

    @Test
    @DisplayName("제품명 다음에 브랜드명을 입력해도 복합 검색한다")
    void findsByProductAndBrandName() {
        Brand roundLab = new Brand(1L, "라운드랩", null, null);
        Brand torriden = new Brand(2L, "토리든", null, null);
        Products products = new Products(
            List.of(
                product(1L, "1025 독도 토너", roundLab),
                product(2L, "자작나무 수분 크림", roundLab),
                product(3L, "다이브인 저분자 히알루론산 토너", torriden)
            )
        );

        assertThat(names(products.search("독도 라운드랩"))).containsExactly("1025 독도 토너");
        assertThat(names(products.search("독도라운드"))).containsExactly("1025 독도 토너");
    }

    @Test
    @DisplayName("브랜드명과 제품명을 붙여 쓰거나 브랜드 접두부만 써도 찾는다")
    void findsCombinedNameWithoutSpacesOrFullBrand() {
        Brand roundLab = new Brand(1L, "라운드랩", null, null);
        Products products = new Products(List.of(product(1L, "1025 독도 토너", roundLab)));

        assertThat(names(products.search("라운드랩독도"))).containsExactly("1025 독도 토너");
        assertThat(names(products.search("라운드독도"))).containsExactly("1025 독도 토너");
    }

    @Test
    @DisplayName("영문 브랜드명과 한글 제품명으로 복합 검색한다")
    void findsByEnglishBrandAndProductName() {
        Brand brand = new Brand(1L, "닥터지", "Dr.G", null);
        Products products = new Products(List.of(product(1L, "레드 블레미쉬 크림", brand)));

        assertThat(names(products.search("dr.g 레드"))).containsExactly("레드 블레미쉬 크림");
    }

    @Test
    @DisplayName("브랜드명과 제품명을 초성으로 복합 검색한다")
    void findsCombinedNameByChosung() {
        Brand roundLab = new Brand(1L, "라운드랩", null, null);
        Products products = new Products(List.of(product(1L, "1025 독도 토너", roundLab)));

        assertThat(names(products.search("ㄹㅇㄷㄹ ㄷㄷ"))).containsExactly("1025 독도 토너");
    }

    @Test
    @DisplayName("브랜드 중간에만 걸리는 앞부분은 복합 검색의 브랜드로 보지 않는다")
    void rejectsPartialBrandInCombinedName() {
        Brand roundLab = new Brand(1L, "라운드랩", null, null);
        Products products = new Products(List.of(product(1L, "1025 독도 토너", roundLab)));

        assertThat(products.search("운드독도")).isEmpty();
        assertThat(products.search("독도운드")).isEmpty();
    }

    @Test
    @DisplayName("복합 검색에서는 정확히 맞은 브랜드의 제품을 접두 일치 브랜드보다 먼저 담는다")
    void ordersCombinedMatchesByBrandThenProductName() {
        Brand exact = new Brand(1L, "다", null, null);
        Brand prefix = new Brand(2L, "다 브랜드", null, null);
        Products products = new Products(
            List.of(
                product(2L, "블랙 크림", prefix),
                product(1L, "블랙 토너", exact)
            )
        );

        assertThat(names(products.search("다 블랙"))).containsExactly("블랙 토너", "블랙 크림");
    }

    @Test
    @DisplayName("제품명 전용 검색에서는 브랜드명을 맞추지 않는다")
    void searchesOnlyProductNameWhenRequested() {
        Brand brand = new Brand(1L, "라운드랩", null, null);
        Products products = new Products(List.of(product(1L, "1025 독도 토너", brand)));

        assertThat(products.searchByProductName("라운드랩")).isEmpty();
        assertThat(products.searchByProductName("라운드랩독도")).isEmpty();
    }

    @Test
    @DisplayName("정확히 같은 이름, 검색어로 시작하는 이름, 나머지 순으로 담는다")
    void ordersByHowWellNameMatches() {
        Products products = new Products(List.of(product(1L, "촉촉 토너 플러스"), product(2L, "토너"), product(3L, "토너 미스트")));

        assertThat(names(products.search("토너"))).containsExactly("토너", "토너 미스트", "촉촉 토너 플러스");
    }

    @Test
    @DisplayName("같은 등급이면 ID 가 작은 제품을 먼저 담는다")
    void ordersSameRankById() {
        Products products = new Products(List.of(product(30L, "토너 마일드"), product(10L, "토너 세라마이드")));

        assertThat(names(products.search("토너"))).containsExactly("토너 세라마이드", "토너 마일드");
    }

    @Test
    @DisplayName("초성으로도 찾는다")
    void findsByChosung() {
        Products products = new Products(List.of(product(1L, "블랙 스네일 토너"), product(2L, "수분 크림")));

        assertThat(names(products.search("ㅅㅂㅋㄹ"))).containsExactly("수분 크림");
    }

    @Test
    @DisplayName("공백을 지우고 맞춘다")
    void ignoresSpaces() {
        Products products = new Products(List.of(product(1L, "블랙 스네일 토너")));

        assertThat(names(products.search("스네일토너"))).containsExactly("블랙 스네일 토너");
    }

    @Test
    @DisplayName("숫자에서 초성이 끊긴다")
    void breaksChosungAtDigits() {
        Products products = new Products(List.of(product(1L, "복숭아 70 나이아신 세럼")));

        assertThat(products.search("ㅂㅅㅇㄴㅇㅇㅅ")).isEmpty();
        assertThat(names(products.search("ㄴㅇㅇㅅ"))).containsExactly("복숭아 70 나이아신 세럼");
    }

    @Test
    @DisplayName("걸리는 제품이 없으면 비어 있다")
    void findsNothingForUnknownKeyword() {
        Products products = new Products(List.of(product(1L, "블랙 스네일 토너")));

        assertThat(products.search("에센스")).isEmpty();
    }

    @Test
    @DisplayName("검색 제안은 요청한 페이지의 제품만 담고 전체 개수를 함께 센다")
    void suggestsRequestedPage() {
        Products products = suggestionProducts();

        ProductSuggestionPage page = products.suggest("토너", 1, 2);

        assertThat(matchedNames(page.items())).containsExactly("토너 3");
        assertThat(page.totalElements()).isEqualTo(3);
    }

    @Test
    @DisplayName("검색 제안은 제품명에서 일치한 원문과 구간을 보존한다")
    void keepsProductNameMatch() {
        MatchedProduct matched = suggestionProducts().suggest("토너", 0, 1).items().getFirst();

        assertThat(matched.field()).isEqualTo(ProductMatchField.PRODUCT_NAME);
        assertThat(matched.textMatch().text()).isEqualTo("토너");
        assertThat(matched.textMatch().range().startIndex()).isZero();
        assertThat(matched.textMatch().range().endIndexExclusive()).isEqualTo(2);
    }

    @Test
    @DisplayName("검색 제안은 브랜드명에서 일치한 원문과 구간을 보존한다")
    void keepsBrandNameMatch() {
        Brand brand = new Brand(1L, "다 브랜드", null, null);
        Products products = new Products(List.of(product(1L, "블랙 스네일 토너", brand)));

        MatchedProduct matched = products.suggest("다브랜드", 0, 1).items().getFirst();

        assertThat(matched.field()).isEqualTo(ProductMatchField.BRAND_NAME);
        assertThat(matched.textMatch().text()).isEqualTo("다 브랜드");
        assertThat(matched.textMatch().range().startIndex()).isZero();
        assertThat(matched.textMatch().range().endIndexExclusive()).isEqualTo(5);
    }

    @Test
    @DisplayName("복합 검색 제안은 제품명에서 일치한 원문과 구간을 보존한다")
    void keepsProductNameMatchForCombinedQuery() {
        Brand brand = new Brand(1L, "다 브랜드", null, null);
        Products products = new Products(List.of(product(1L, "블랙 스네일 토너", brand)));

        MatchedProduct matched = products.suggest("다브랜드 스네일", 0, 1).items().getFirst();

        assertThat(matched.field()).isEqualTo(ProductMatchField.PRODUCT_NAME);
        assertThat(matched.textMatch().text()).isEqualTo("블랙 스네일 토너");
        assertThat(matched.textMatch().range().startIndex()).isEqualTo(3);
        assertThat(matched.textMatch().range().endIndexExclusive()).isEqualTo(6);
    }

    @Test
    @DisplayName("제품명과 브랜드명 순서를 바꾼 복합 검색 제안도 제품명 일치 구간을 보존한다")
    void keepsProductNameMatchForReversedCombinedQuery() {
        Brand brand = new Brand(1L, "다 브랜드", null, null);
        Products products = new Products(List.of(product(1L, "블랙 스네일 토너", brand)));

        MatchedProduct matched = products.suggest("스네일 다브랜드", 0, 1).items().getFirst();

        assertThat(matched.field()).isEqualTo(ProductMatchField.PRODUCT_NAME);
        assertThat(matched.textMatch().text()).isEqualTo("블랙 스네일 토너");
        assertThat(matched.textMatch().range().startIndex()).isEqualTo(3);
        assertThat(matched.textMatch().range().endIndexExclusive()).isEqualTo(6);
    }

    @Test
    @DisplayName("검색 제안은 페이지를 나눠도 검색 순서를 유지한다")
    void keepsSearchOrderAcrossSuggestionPages() {
        Products products = suggestionProducts();

        assertThat(matchedNames(products.suggest("토너", 0, 2).items())).containsExactly("토너", "토너 2");
    }

    @Test
    @DisplayName("검색 제안에서 결과를 넘어선 페이지는 비어 있고 전체 개수는 그대로다")
    void suggestsEmptyPageBeyondResult() {
        ProductSuggestionPage page = suggestionProducts().suggest("토너", 5, 2);

        assertThat(page.items()).isEmpty();
        assertThat(page.totalElements()).isEqualTo(3);
    }

    @Test
    @DisplayName("검색 제안은 페이지 조건이 올바르지 않으면 거절한다")
    void rejectsInvalidSuggestionPageCondition() {
        Products products = suggestionProducts();

        assertThatThrownBy(() -> products.suggest("토너", -1, 2)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> products.suggest("토너", 0, 0)).isInstanceOf(IllegalArgumentException.class);
    }

    private static Products suggestionProducts() {
        return new Products(List.of(product(1L, "토너"), product(2L, "토너 2"), product(3L, "토너 3")));
    }
}
