package com.poudy.product.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest
@AutoConfigureMockMvc
class ProductSelectedFiltersTest {

    @Autowired
    private MockMvc mockMvc;

    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    @DisplayName("후보의 표시 순서와 선택의 요청 순서는 서로 독립적으로 유지한다")
    void preservesCandidateOrderAndSelectionOrder() throws Exception {
        mockMvc.perform(get("/api/products").param("brandIds", "1", "3").param("categoryIds", "14", "2"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.filterOptions.brands[*].id").value(contains(3, 1)))
            .andExpect(jsonPath("$.filterOptions.categories[*].id").value(contains(1, 13)))
            .andExpect(jsonPath("$.filterOptions.categories[0].children[*].id").value(contains(2, 3)))
            .andExpect(jsonPath("$.selectedFilters.brands[*].id").value(contains(1, 3)))
            .andExpect(jsonPath("$.selectedFilters.categories[*].id").value(contains(14, 2)));
    }

    @Test
    @DisplayName("카테고리 때문에 후보에서 빠진 선택 브랜드도 요청 순서대로 이름을 제공한다")
    void includesSelectedBrandsOutsideCandidates() throws Exception {
        mockMvc.perform(get("/api/products").param("brandIds", "3", "1").param("categoryIds", "3"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items[*].id").value(contains(7)))
            .andExpect(jsonPath("$.filterOptions.brands[*].id").value(contains(1)))
            .andExpect(jsonPath("$.selectedFilters.brands[*].id").value(contains(3, 1)))
            .andExpect(jsonPath("$.selectedFilters.brands[*].name").value(contains("나 브랜드", "다 브랜드")))
            .andExpect(jsonPath("$.selectedFilters.brands[0].*").value(hasSize(2)))
            .andExpect(jsonPath("$.selectedFilters.categories[*].id").value(contains(3)))
            .andExpect(jsonPath("$.selectedFilters.categories[0].name").value("에센스/세럼/앰플"));
    }

    @Test
    @DisplayName("후보에서 빠진 카테고리와 직접 선택한 부모를 요청 순서의 평탄한 목록으로 제공한다")
    void includesSelectedCategoriesOutsideCandidates() throws Exception {
        mockMvc.perform(get("/api/products").param("categoryIds", "14", "2", "1").param("brandIds", "3"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.pagination.totalElements").value(2))
            .andExpect(jsonPath("$.filterOptions.categories[*].id").value(contains(1)))
            .andExpect(jsonPath("$.filterOptions.categories[0].children[*].id").value(contains(2)))
            .andExpect(jsonPath("$.selectedFilters.categories[*].id").value(contains(14, 2, 1)))
            .andExpect(jsonPath("$.selectedFilters.categories[*].name").value(contains("선크림", "스킨/토너", "스킨케어")))
            .andExpect(jsonPath("$.selectedFilters.categories[0].*").value(hasSize(2)));
    }

    @Test
    @DisplayName("제품이 없는 브랜드와 검색 결과가 없어도 존재하는 선택의 이름은 유지한다")
    void keepsNamesWithoutMatchingProducts() throws Exception {
        mockMvc.perform(
            get("/api/products").param("brandIds", "2").param("categoryIds", "2")
                .param("keyword", "존재하지않는제품")
        )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items").isEmpty())
            .andExpect(jsonPath("$.pagination.totalElements").value(0))
            .andExpect(jsonPath("$.filterOptions.brands").isEmpty())
            .andExpect(jsonPath("$.filterOptions.categories").isEmpty())
            .andExpect(jsonPath("$.selectedFilters.brands[*].id").value(contains(2)))
            .andExpect(jsonPath("$.selectedFilters.brands[0].name").value("가 브랜드"))
            .andExpect(jsonPath("$.selectedFilters.categories[*].id").value(contains(2)))
            .andExpect(jsonPath("$.selectedFilters.categories[0].name").value("스킨/토너"));
    }

    @ParameterizedTest
    @CsvSource({"brandIds", "categoryIds"})
    @DisplayName("없는 ID만 선택하면 기존처럼 200과 빈 결과를 반환하고 선택 이름은 생략한다")
    void preservesUnknownIdResults(String condition) throws Exception {
        mockMvc.perform(get("/api/products").param(condition, "999999"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items").isEmpty())
            .andExpect(jsonPath("$.pagination.totalElements").value(0))
            .andExpect(jsonPath("$.selectedFilters.brands").isEmpty())
            .andExpect(jsonPath("$.selectedFilters.categories").isEmpty())
            .andExpect(jsonPath("$.selectedFilters.*").value(hasSize(2)));
        mockMvc.perform(get("/api/products/count").param(condition, "999999"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.count").value(0));
    }

    @Test
    @DisplayName("정상 ID에 없는 ID를 섞어도 결과·후보·count는 유지하고 존재하는 선택 이름만 제공한다")
    void omitsUnknownIdsFromMixedSelections() throws Exception {
        JsonNode expected = response(get("/api/products").param("brandIds", "3").param("categoryIds", "2"));
        JsonNode actual = response(
            get("/api/products").param("brandIds", "999999", "3").param("categoryIds", "999999", "2")
        );
        assertThat(actual.path("items")).isEqualTo(expected.path("items"));
        assertThat(actual.path("pagination")).isEqualTo(expected.path("pagination"));
        assertThat(actual.path("filterOptions")).isEqualTo(expected.path("filterOptions"));
        assertThat(actual.path("selectedFilters")).isEqualTo(expected.path("selectedFilters"));
        assertThat(actual.path("selectedFilters").path("brands").get(0).path("name").asText()).isEqualTo("나 브랜드");
        assertThat(actual.path("selectedFilters").path("categories").get(0).path("name").asText()).isEqualTo("스킨/토너");
        mockMvc.perform(
            get("/api/products/count").param("brandIds", "999999", "3").param("categoryIds", "999999", "2")
        ).andExpect(status().isOk()).andExpect(jsonPath("$.count").value(2));
    }

    @Test
    @DisplayName("후속 페이지는 선택한 값이 있어도 이름 필드를 생략한다")
    void omitsSelectionsOnLaterPages() throws Exception {
        mockMvc.perform(get("/api/products").param("brandIds", "3").param("page", "2").param("size", "1"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items").value(hasSize(1)))
            .andExpect(jsonPath("$.filterOptions").doesNotHaveJsonPath())
            .andExpect(jsonPath("$.selectedFilters").doesNotHaveJsonPath());
    }

    private JsonNode response(MockHttpServletRequestBuilder request) throws Exception {
        return mapper.readTree(
            mockMvc.perform(request).andExpect(status().isOk()).andReturn().getResponse().getContentAsString()
        );
    }
}
