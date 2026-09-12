package com.poudy.product.controller;

import static org.hamcrest.Matchers.containsInAnyOrder;
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
    @CsvSource({"SENSITIVE,1", "OILY,13", "COMBINATION,15"})
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
    @CsvSource({"0,13,true", "1,1,true", "2,15,false"})
    @DisplayName("피부타입 필터 후 페이지와 무관하게 전체 결과의 브랜드와 카테고리를 집계한다")
    void aggregatesBeforePagination(int page, int productId, boolean hasNext) throws Exception {
        mockMvc.perform(
            get("/api/products").param("skinType", "DRY")
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
            .andExpect(jsonPath("$.categories[0].children[0].productCount").value(3));
        mockMvc.perform(get("/api/products/count").param("skinType", "DRY"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.count").value(3));
    }

    @Test
    @DisplayName("마지막 페이지를 넘어가도 전체 필터 개수와 집계를 유지한다")
    void retainsTotalsBeyondLastPage() throws Exception {
        mockMvc.perform(get("/api/products").param("skinType", "DRY").param("page", "3").param("size", "1"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items").isEmpty())
            .andExpect(jsonPath("$.pagination.totalElements").value(3))
            .andExpect(jsonPath("$.pagination.hasNext").value(false))
            .andExpect(jsonPath("$.brands[*].id").value(containsInAnyOrder(1, 3)))
            .andExpect(jsonPath("$.categories[0].productCount").value(3));
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
    }

    @ParameterizedTest
    @ValueSource(strings = {"UNKNOWN", "dry", "DRY,OILY", "1"})
    @DisplayName("잘못된 피부타입 코드는 목록과 개수에서 요청 오류로 거부한다")
    void rejectsInvalidCode(String skinType) throws Exception {
        for (String path : new String[] {"/api/products", "/api/products/count"}) {
            mockMvc.perform(get(path).param("skinType", skinType))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_QUERY_PARAMETER"));
        }
    }

    @ParameterizedTest
    @ValueSource(strings = {"SENSITIVE", "DRY"})
    @DisplayName("중복 단일 파라미터는 기존 enum 바인딩과 같이 첫 번째 값을 사용한다")
    void usesFirstValueForRepeatedParameter(String secondValue) throws Exception {
        mockMvc.perform(get("/api/products").param("skinType", "SENSITIVE", secondValue))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items[*].id").value(containsInAnyOrder(1)))
            .andExpect(jsonPath("$.pagination.totalElements").value(1));
        mockMvc.perform(get("/api/products/count").param("skinType", "SENSITIVE", secondValue))
            .andExpect(status().isOk()).andExpect(jsonPath("$.count").value(1));
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
