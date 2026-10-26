package com.poudy.product.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.poudy.product.repository.ProductRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.jdbc.Sql;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@Sql({"/db/search-test-data.sql", "/db/product-suggestion-and-test-data.sql"})
@DisplayName("상품 추천의 검색 조건 AND 적용")
class ProductSuggestionAndSearchTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private ProductRepository products;

    @Test
    @DisplayName("브랜드 조건을 추가하면 다른 브랜드의 로션과 같은 브랜드의 크림을 제외한다")
    void narrowsSuggestionsWhenBrandIsAdded() throws Exception {
        mockMvc.perform(get("/api/products/suggestions").param("keyword", "로션"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items[*].id").value(containsInAnyOrder(90015, 90017, 90019, 90020)))
            .andExpect(jsonPath("$.pagination.totalElements").value(4));

        mockMvc.perform(get("/api/products/suggestions").param("keyword", "에스트라 로션"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items[*].id").value(contains(90020, 90015)))
            .andExpect(jsonPath("$.pagination.totalElements").value(2));
    }

    @ParameterizedTest
    @ValueSource(strings = {"로션 에스트라", "에스트라로션", "로션에스트라", "에스트라 로", "에스트라 ㄹㅅ"})
    @DisplayName("순서·띄어쓰기·기존 부분 입력·초성 검색에서도 브랜드와 제품 조건을 함께 지킨다")
    void retainsOtherConditions(String keyword) throws Exception {
        mockMvc.perform(get("/api/products/suggestions").param("keyword", keyword))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items[*].id").value(contains(90020, 90015)))
            .andExpect(jsonPath("$.pagination.totalElements").value(2));
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "로션 닥터지 앰플",
            "로션 앰플 닥터지",
            "닥터지 로션 앰플",
            "닥터지 앰플 로션",
            "앰플 로션 닥터지",
            "앰플 닥터지 로션"
    })
    @DisplayName("세 조건을 서로 다른 상품에서 모으지 않고 전체 일치가 없으면 빈 결과를 반환한다")
    void returnsNothingWhenNoProductMeetsAllConditions(String keyword) throws Exception {
        mockMvc.perform(get("/api/products/suggestions").param("keyword", keyword))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items").isEmpty())
            .andExpect(jsonPath("$.pagination.totalElements").value(0));
        mockMvc.perform(get("/api/products/count").param("keyword", keyword))
            .andExpect(status().isOk()).andExpect(jsonPath("$.count").value(0));
        assertThat(products.hasSearchResults(keyword)).isFalse();
    }

    @Test
    @DisplayName("세 조건을 모두 만족하는 상품이 있어도 일부 조건만 맞는 상품을 덧붙이지 않는다")
    void keepsOnlyFullMatchesWhenPresent() throws Exception {
        jdbc.update("update product set product_name = '로션 앰플' where id = 90018");
        jdbc.execute("refresh materialized view product_search_document");

        mockMvc.perform(get("/api/products/suggestions").param("keyword", "로션 닥터지 앰플"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items[*].id").value(contains(90018)))
            .andExpect(jsonPath("$.pagination.totalElements").value(1));
    }

    @Test
    @DisplayName("오타를 고친 뒤에도 브랜드 조건을 지키고 실제 교정된 제품명을 강조한다")
    void preservesConditionsAfterCorrection() throws Exception {
        mockMvc.perform(get("/api/products/suggestions").param("keyword", "검증브랜드 검증스내일"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items[*].id").value(contains(90012)))
            .andExpect(jsonPath("$.pagination.totalElements").value(1))
            .andExpect(jsonPath("$.items[0].match.text").value("검증스네일 세럼"))
            .andExpect(jsonPath("$.items[0].match.startIndex").value(0))
            .andExpect(jsonPath("$.items[0].match.endIndexExclusive").value(5));

        assertThat(jdbc.queryForObject("select search_correct_query(?, 'PRODUCT')", String.class, "에스트라 검증스내일"))
            .isEqualTo("에스트라 검증스네일");
        mockMvc.perform(get("/api/products/suggestions").param("keyword", "에스트라 검증스내일"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items").isEmpty())
            .andExpect(jsonPath("$.pagination.totalElements").value(0));
    }

    @Test
    @DisplayName("부분 일치를 제외한 전체 개수·순서·강조 구간으로 페이지를 나눈다")
    void pagesOnlyFullMatches() throws Exception {
        mockMvc.perform(get("/api/products/suggestions").param("keyword", "에스트라 로션").param("size", "1"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items[*].id").value(contains(90020)))
            .andExpect(jsonPath("$.pagination.totalElements").value(2))
            .andExpect(jsonPath("$.items[0].match.field").value("PRODUCT_NAME"))
            .andExpect(jsonPath("$.items[0].match.text").value("수딩 로션"))
            .andExpect(jsonPath("$.items[0].match.startIndex").value(3))
            .andExpect(jsonPath("$.items[0].match.endIndexExclusive").value(5));
        mockMvc.perform(
            get("/api/products/suggestions").param("keyword", "에스트라 로션").param("page", "2").param("size", "1")
        )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items[*].id").value(contains(90015)))
            .andExpect(jsonPath("$.pagination.totalElements").value(2));
        mockMvc.perform(
            get("/api/products/suggestions").param("keyword", "에스트라 로션").param("page", "3").param("size", "1")
        )
            .andExpect(status().isOk()).andExpect(jsonPath("$.items").isEmpty())
            .andExpect(jsonPath("$.pagination.totalElements").value(2));
    }

    @Test
    @DisplayName("목록·count·필터 집계·결과 존재 확인도 같은 전체 일치 후보를 사용한다")
    void agreesWithCatalogQueries() throws Exception {
        mockMvc.perform(get("/api/products").param("keyword", "에스트라 로션"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items[*].id").value(contains(90020, 90015)))
            .andExpect(jsonPath("$.pagination.totalElements").value(2))
            .andExpect(jsonPath("$.items[*].brand.id").value(contains(90003, 90003)))
            .andExpect(jsonPath("$.categories[0].productCount").value(2))
            .andExpect(jsonPath("$.filterOptions.brands[*].id").value(contains(90003)))
            .andExpect(jsonPath("$.filterOptions.categories[0].productCount").value(2));
        mockMvc.perform(get("/api/products/count").param("keyword", "에스트라 로션"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.count").value(2));
        assertThat(products.hasSearchResults("에스트라 로션")).isTrue();
    }
}
