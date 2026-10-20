package com.poudy.product.controller;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.hamcrest.Matchers.empty;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;

@SpringBootTest
@AutoConfigureMockMvc
@DisplayName("제품 피부타입 필터")
class ProductSkinTypeFilterTest {

    @Autowired
    private MockMvc mockMvc;

    @ParameterizedTest
    @CsvSource({"OILY,13", "COMBINATION,15"})
    @DisplayName("복수 타입 제품은 선택한 단일 타입에 포함되면 목록과 개수에 포함한다")
    void filtersByEachSkinType(String skinType, int productId) throws Exception {
        mockMvc.perform(get("/api/products").param("skinType", skinType))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items[*].id").value(containsInAnyOrder(productId)))
            .andExpect(jsonPath("$.pagination.totalElements").value(1))
            .andExpect(jsonPath("$.brands[*].id").value(containsInAnyOrder(productId == 1 ? 1 : 3)))
            .andExpect(jsonPath("$.categories[0].productCount").value(1))
            .andExpect(jsonPath("$.items[0].skinTypes").doesNotExist())
            .andExpect(jsonPath("$.items[0].skinType").doesNotExist());
        mockMvc.perform(get("/api/products/count").param("skinType", skinType))
            .andExpect(status().isOk()).andExpect(jsonPath("$.count").value(1));
    }

    @Test
    @DisplayName("피부타입 미지정 시 빈 배열과 누락 필드 제품도 기존 목록과 개수에 포함한다")
    void includesUnclassifiedProductsWithoutFilter() throws Exception {
        mockMvc.perform(get("/api/products"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items[*].id").value(containsInAnyOrder(1, 7, 10, 13, 15)))
            .andExpect(jsonPath("$.pagination.totalElements").value(5));
        mockMvc.perform(get("/api/products/count"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.count").value(5));
    }

    @ParameterizedTest
    @CsvSource({"1,13,true", "2,1,true", "3,15,false"})
    @DisplayName("피부 타입과 민감성 OR 검색의 제품을 중복 없이 페이지로 나누고 전체 집계를 유지한다")
    void aggregatesBeforePagination(int page, int productId, boolean hasNext) throws Exception {
        mockMvc.perform(
            get("/api/products").param("skinType", "OILY", "COMBINATION").param("sensitiveSkin", "true")
                .param("sort", "PRICE_DESC").param("page", String.valueOf(page)).param("size", "1")
        )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items[*].id").value(containsInAnyOrder(productId)))
            .andExpect(jsonPath("$.pagination.totalElements").value(3))
            .andExpect(jsonPath("$.pagination.totalPages").value(3))
            .andExpect(jsonPath("$.pagination.hasNext").value(hasNext))
            .andExpect(jsonPath("$.brands[*].id").value(containsInAnyOrder(1, 3)))
            .andExpect(jsonPath("$.categories.length()").value(1))
            .andExpect(jsonPath("$.categories[0].id").value(1))
            .andExpect(jsonPath("$.categories[0].productCount").value(3))
            .andExpect(jsonPath("$.categories[0].children.length()").value(1))
            .andExpect(jsonPath("$.categories[0].children[0].id").value(2))
            .andExpect(jsonPath("$.categories[0].children[0].productCount").value(3))
            .andExpect(jsonPath("$.skinTypes[*].code").value(contains("DRY", "OILY", "COMBINATION")))
            .andExpect(jsonPath("$.skinTypes[*].name").value(contains("건성", "지성", "복합성")));
        mockMvc
            .perform(get("/api/products/count").param("skinType", "OILY", "COMBINATION").param("sensitiveSkin", "true"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.count").value(3));
    }

    @Test
    @DisplayName("마지막 페이지를 넘어가도 전체 필터 개수와 집계를 유지한다")
    void retainsTotalsBeyondLastPage() throws Exception {
        mockMvc.perform(get("/api/products").param("skinType", "DRY").param("page", "4").param("size", "1"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items").isEmpty())
            .andExpect(jsonPath("$.pagination.totalElements").value(3))
            .andExpect(jsonPath("$.pagination.hasNext").value(false))
            .andExpect(jsonPath("$.brands[*].id").value(containsInAnyOrder(1, 3)))
            .andExpect(jsonPath("$.categories[0].productCount").value(3))
            .andExpect(jsonPath("$.skinTypes[*].code").value(contains("DRY", "OILY", "COMBINATION")));
    }

    @Test
    @DisplayName("조회 결과가 없거나 모든 결과가 미분류이면 피부타입 선택지가 비어 있다")
    void returnsNoSkinTypesWithoutClassifiedResults() throws Exception {
        mockMvc.perform(get("/api/products").param("keyword", "존재하지 않는 제품"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.skinTypes").value(empty()));

        mockMvc.perform(get("/api/products").param("keyword", "레티놀 콜라겐"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.pagination.totalElements").value(1))
            .andExpect(jsonPath("$.skinTypes").value(empty()));
    }

    @ParameterizedTest
    @CsvSource({
            "keyword,토너,3",
            "keyword,세럼,0",
            "categoryIds,1,3",
            "categoryIds,3,0",
            "brandIds,3,2",
            "includeIngredientIds,4815,2",
            "excludeIngredientIds,4815,1",
            "excludeCodes,FRAGRANCE_ALLERGENS,0",
            "moistureLevel,2,3",
            "moistureLevel,0,0",
            "oilLevel,0,3",
            "oilLevel,3,0"})
    @DisplayName("각 기존 필터와 피부타입을 AND로 결합하고 목록과 count를 일치시킨다")
    void combinesWithExistingFilters(String parameter, String value, int count) throws Exception {
        MultiValueMap<String, String> params = new LinkedMultiValueMap<>();
        params.add("skinType", "DRY");
        params.add(parameter, value);
        assertCount(params, count);
    }

    @Test
    @DisplayName("여러 필터와 피부타입이 동시에 적용된다")
    void combinesAllFilters() throws Exception {
        MultiValueMap<String, String> params = new LinkedMultiValueMap<>();
        params.add("skinType", "DRY");
        params.add("keyword", "토너");
        params.add("categoryIds", "1");
        params.add("brandIds", "3");
        params.add("includeIngredientIds", "4815");
        params.add("excludeIngredientIds", "20");
        params.add("moistureLevel", "2");
        params.add("oilLevel", "0");
        assertCount(params, 1);
        mockMvc.perform(get("/api/products").params(params))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.skinTypes[*].code").value(contains("DRY", "OILY")));
    }

    @ParameterizedTest
    @ValueSource(strings = {"UNKNOWN", "SENSITIVE", "dry", "1"})
    @DisplayName("잘못된 피부타입 코드는 목록과 개수에서 요청 오류로 거부한다")
    void rejectsInvalidCode(String skinType) throws Exception {
        for (String path : new String[] {"/api/products", "/api/products/count"}) {
            mockMvc.perform(get(path).param("skinType", skinType))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_QUERY_PARAMETER"));
            mockMvc.perform(get(path).param("skinType", "OILY", skinType))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_QUERY_PARAMETER"));
        }
    }

    @Test
    @DisplayName("여러 피부 타입은 OR로 검색하고 두 타입에 모두 맞는 제품도 한 번만 센다")
    void combinesSkinTypesWithOr() throws Exception {
        mockMvc.perform(get("/api/products").param("skinType", "DRY", "OILY"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items[*].id").value(containsInAnyOrder(1, 13, 15)))
            .andExpect(jsonPath("$.pagination.totalElements").value(3));
        mockMvc.perform(get("/api/products/count").param("skinType", "DRY", "OILY"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.count").value(3));
        mockMvc.perform(get("/api/products").param("skinType", "OILY", "COMBINATION"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items[*].id").value(containsInAnyOrder(13, 15)));
        mockMvc.perform(get("/api/products/count").param("skinType", "OILY,COMBINATION"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.count").value(2));
    }

    @Test
    @DisplayName("다른 목록 조건처럼 중복 피부 타입은 요청 오류로 거부한다")
    void rejectsDuplicateSkinTypes() throws Exception {
        for (String path : new String[] {"/api/products", "/api/products/count"}) {
            mockMvc.perform(get(path).param("skinType", "DRY", "DRY"))
                .andExpect(status().isBadRequest());
        }
    }

    @Test
    @DisplayName("민감성 단독 선택은 민감성 제품만 고르고 피부 타입과 함께 고르면 OR로 결합한다")
    void filtersSensitiveSkinProducts() throws Exception {
        mockMvc.perform(get("/api/products").param("sensitiveSkin", "true"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items[*].id").value(containsInAnyOrder(1)))
            .andExpect(jsonPath("$.items[0].sensitiveSkin").value(true));
        mockMvc.perform(get("/api/products/count").param("sensitiveSkin", "true").param("skinType", "DRY"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.count").value(3));
        mockMvc.perform(get("/api/products/count").param("sensitiveSkin", "true").param("skinType", "OILY"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.count").value(2));
        mockMvc.perform(get("/api/products").param("sensitiveSkin", "true").param("skinType", "OILY"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items[*].id").value(containsInAnyOrder(1, 13)));
        mockMvc.perform(get("/api/products/count").param("sensitiveSkin", "false").param("skinType", "OILY"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.count").value(1));
        mockMvc.perform(get("/api/products/count").param("sensitiveSkin", "false"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.count").value(5));
    }

    @ParameterizedTest
    @CsvSource({
            "keyword,토너,3",
            "keyword,세럼,0",
            "categoryIds,1,3",
            "categoryIds,3,0",
            "brandIds,1,1",
            "brandIds,3,2",
            "includeIngredientIds,4815,2",
            "excludeIngredientIds,4815,1",
            "moistureLevel,2,3",
            "moistureLevel,0,0",
            "oilLevel,0,3",
            "oilLevel,3,0"})
    @DisplayName("피부 타입과 민감성 OR 그룹은 다른 검색·필터 조건과 AND로 결합한다")
    void combinesSkinGroupWithOtherFilters(String parameter, String value, int count) throws Exception {
        MultiValueMap<String, String> params = new LinkedMultiValueMap<>();
        params.add("skinType", "OILY");
        params.add("skinType", "COMBINATION");
        params.add("sensitiveSkin", "true");
        params.add(parameter, value);
        assertCount(params, count);
    }

    @Test
    @DisplayName("빈 피부타입은 기존 선택적 enum 파라미터와 같이 미지정으로 처리한다")
    void treatsEmptySkinTypeAsMissing() throws Exception {
        MultiValueMap<String, String> params = new LinkedMultiValueMap<>();
        params.add("skinType", "");
        assertCount(params, 5);
    }

    private void assertCount(MultiValueMap<String, String> params, int count) throws Exception {
        mockMvc.perform(get("/api/products").params(params))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items.length()").value(count))
            .andExpect(jsonPath("$.pagination.totalElements").value(count));
        mockMvc.perform(get("/api/products/count").params(params))
            .andExpect(status().isOk()).andExpect(jsonPath("$.count").value(count));
    }
}
