package com.poudy.product.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
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
class ProductRetainedFilterOptionsTest {

    @Autowired
    private MockMvc mockMvc;

    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    @DisplayName("후보에서 빠진 선택 브랜드의 이름과 0개를 기존 이름순으로 제공한다")
    void retainsSelectedBrandWithZeroCount() throws Exception {
        mockMvc.perform(get("/api/products").param("brandIds", "1", "3").param("categoryIds", "3"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items[*].id").value(contains(7)))
            .andExpect(jsonPath("$.filterOptions.brands[*].id").value(contains(3, 1)))
            .andExpect(jsonPath("$.filterOptions.brands[*].name").value(contains("나 브랜드", "다 브랜드")))
            .andExpect(jsonPath("$.filterOptions.brands[*].productCount").value(contains(0, 1)))
            .andExpect(jsonPath("$.selectedFilters").doesNotHaveJsonPath());
    }

    @Test
    @DisplayName("선택한 0개 소분류와 부모를 포함하고 실제 부모 개수와 형제 후보를 유지한다")
    void retainsSelectedChildAndItsParent() throws Exception {
        mockMvc.perform(get("/api/products").param("categoryIds", "14", "3", "1").param("brandIds", "3"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.filterOptions.categories[*].id").value(contains(1, 13)))
            .andExpect(jsonPath("$.filterOptions.categories[*].productCount").value(contains(2, 0)))
            .andExpect(jsonPath("$.filterOptions.categories[0].children[*].id").value(contains(2, 3)))
            .andExpect(jsonPath("$.filterOptions.categories[0].children[*].productCount").value(contains(2, 0)))
            .andExpect(jsonPath("$.filterOptions.categories[1].children[*].id").value(contains(14)))
            .andExpect(jsonPath("$.filterOptions.categories[1].children[0].name").value("선크림"))
            .andExpect(jsonPath("$.filterOptions.categories[1].children[0].productCount").value(0));
    }

    @Test
    @DisplayName("0개 부모만 선택하면 선택하지 않은 0개 자식은 추가하지 않는다")
    void doesNotExpandEmptyParentSelection() throws Exception {
        mockMvc.perform(get("/api/products").param("categoryIds", "13").param("brandIds", "3"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.filterOptions.categories[*].id").value(contains(1, 13)))
            .andExpect(jsonPath("$.filterOptions.categories[1].productCount").value(0))
            .andExpect(jsonPath("$.filterOptions.categories[1].children").isEmpty());
    }

    @Test
    @DisplayName("빈 검색 결과와 상품 없는 브랜드에서도 선택 이름을 0개로 유지한다")
    void retainsNamesWhenNoProductsMatch() throws Exception {
        mockMvc.perform(
            get("/api/products").param("brandIds", "2").param("categoryIds", "2")
                .param("keyword", "존재하지않는제품")
        )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items").isEmpty())
            .andExpect(jsonPath("$.pagination.totalElements").value(0))
            .andExpect(jsonPath("$.filterOptions.brands[*].id").value(contains(2)))
            .andExpect(jsonPath("$.filterOptions.brands[0].name").value("가 브랜드"))
            .andExpect(jsonPath("$.filterOptions.brands[0].productCount").value(0))
            .andExpect(jsonPath("$.filterOptions.categories[*].id").value(contains(1)))
            .andExpect(jsonPath("$.filterOptions.categories[0].children[*].id").value(contains(2)))
            .andExpect(jsonPath("$.filterOptions.categories[0].children[0].name").value("스킨/토너"))
            .andExpect(jsonPath("$.filterOptions.categories[0].children[0].productCount").value(0));
    }

    @ParameterizedTest
    @CsvSource({"brandIds,brands", "categoryIds,categories"})
    @DisplayName("없는 ID만 선택하면 200과 빈 결과를 유지하고 가짜 선택지를 만들지 않는다")
    void preservesUnknownIdResults(String condition, String field) throws Exception {
        JsonNode response = response(get("/api/products").param(condition, "999999"));
        assertThat(response.path("items").isEmpty()).isTrue();
        assertThat(response.path("pagination").path("totalElements").asLong()).isZero();
        assertThat(response.path("filterOptions").path(field).toString()).doesNotContain("999999");
        mockMvc.perform(get("/api/products/count").param(condition, "999999"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.count").value(0));
    }

    @Test
    @DisplayName("정상 ID에 없는 ID를 섞어도 결과와 선택지 및 count가 같다")
    void ignoresUnknownIdsInMixedSelections() throws Exception {
        JsonNode expected = response(get("/api/products").param("brandIds", "3").param("categoryIds", "2"));
        JsonNode actual = response(
            get("/api/products").param("brandIds", "999999", "3")
                .param("categoryIds", "999999", "2")
        );
        assertThat(actual).isEqualTo(expected);
        mockMvc.perform(
            get("/api/products/count").param("brandIds", "999999", "3")
                .param("categoryIds", "999999", "2")
        )
            .andExpect(status().isOk()).andExpect(jsonPath("$.count").value(2));
    }

    @Test
    @DisplayName("선택한 피부 타입과 민감성의 0개 이름을 유지하고 미선택 0개는 제외한다")
    void retainsSkinSelectionsWithoutCandidates() throws Exception {
        mockMvc.perform(
            get("/api/products").param("keyword", "존재하지않는제품")
                .param("skinType", "COMBINATION", "OILY").param("sensitiveSkin", "true")
        )
            .andExpect(status().isOk())
            .andExpect(
                jsonPath("$.filterOptions.skinOptions[*].code").value(contains("OILY", "COMBINATION", "SENSITIVE"))
            )
            .andExpect(jsonPath("$.filterOptions.skinOptions[*].name").value(contains("지성", "복합성", "민감성")))
            .andExpect(jsonPath("$.filterOptions.skinOptions[*].productCount").value(contains(0, 0, 0)))
            .andExpect(jsonPath("$.filterOptions.sensitiveSkin").doesNotHaveJsonPath());
        mockMvc.perform(get("/api/products").param("keyword", "존재하지않는제품"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.filterOptions.skinOptions").isEmpty())
            .andExpect(jsonPath("$.filterOptions.sensitiveSkin").doesNotHaveJsonPath());
    }

    @Test
    @DisplayName("후속 페이지는 선택한 값이 있어도 필터 정보를 생략한다")
    void omitsOptionsOnLaterPages() throws Exception {
        mockMvc.perform(get("/api/products").param("brandIds", "3").param("page", "2").param("size", "1"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items[0].id").isNumber())
            .andExpect(jsonPath("$.filterOptions").doesNotHaveJsonPath())
            .andExpect(jsonPath("$.selectedFilters").doesNotHaveJsonPath());
    }

    private JsonNode response(MockHttpServletRequestBuilder request) throws Exception {
        return mapper.readTree(
            mockMvc.perform(request).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString()
        );
    }
}
