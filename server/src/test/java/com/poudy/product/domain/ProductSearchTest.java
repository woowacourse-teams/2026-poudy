package com.poudy.product.domain;

import static org.assertj.core.api.Assertions.assertThat;

import com.poudy.ingredient.domain.Ingredients;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("제품 검색")
class ProductSearchTest {

    private static Product product(Long id, String name) {
        return new Product(id, 1L, 1L, name, new Ingredients(List.of()));
    }

    private static List<String> names(List<Product> products) {
        return products.stream()
                .map(Product::productName)
                .toList();
    }

    @Test
    @DisplayName("제품명을 부분 일치시킨다")
    void findsByPartialName() {
        Products products = new Products(List.of(product(1L, "블랙 스네일 토너"), product(2L, "수분 크림")));

        assertThat(names(products.search("토너"))).containsExactly("블랙 스네일 토너");
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
}
