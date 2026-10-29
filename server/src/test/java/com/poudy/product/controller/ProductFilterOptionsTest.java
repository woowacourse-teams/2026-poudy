package com.poudy.product.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest
@AutoConfigureMockMvc
class ProductFilterOptionsTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbc;

    private final ObjectMapper mapper = new ObjectMapper();

    @ParameterizedTest
    @CsvSource({"brandIds,brands", "categoryIds,categories", "skinType,skinTypes"})
    void excludesOnlyItsOwnCondition(String condition, String field) throws Exception {
        for (String extra : List.of(
            "",
            "keyword",
            "moistureLevel",
            "oilLevel",
            "includeIngredientIds",
            "excludeIngredientIds",
            "excludeCodes"
        )) {
            MultiValueMap<String, String> params = new LinkedMultiValueMap<>();
            params.add("brandIds", "1,3");
            params.add("categoryIds", "2,4");
            params.add("skinType", "DRY");
            params.add("size", "1");
            if (!extra.isEmpty()) {
                params.add(extra, switch (extra) {
                    case "keyword" -> "토너";
                    case "moistureLevel" -> "2";
                    case "oilLevel" -> "0";
                    case "excludeCodes" -> "FRAGRANCE_ALLERGENS";
                    default -> "4815";
                });
            }
            JsonNode actual = response(params);
            params.remove(condition);
            JsonNode expected = response(params);
            assertThat(actual.path("filterOptions").path(field)).as("%s with %s", field, extra)
                .isEqualTo(expected.path("filterOptions").path(field));
        }
    }

    @Test
    void keepsOptionsWhenActualResultsAreEmpty() throws Exception {
        mockMvc.perform(get("/api/products").param("brandIds", "999999"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items").isEmpty())
            .andExpect(jsonPath("$.brands").doesNotHaveJsonPath())
            .andExpect(jsonPath("$.filterOptions.brands").isNotEmpty())
            .andExpect(jsonPath("$.filterOptions.categories").isEmpty())
            .andExpect(jsonPath("$.filterOptions.skinTypes").isEmpty())
            .andExpect(jsonPath("$.filterOptions.sensitiveSkin").value(false));
    }

    @ParameterizedTest
    @CsvSource({"1,토너", "2,토너", "1,존재하지않는제품", "2,존재하지않는제품"})
    @DisplayName("첫 페이지·후속 페이지·빈 결과에 미사용 최상위 분류 집계를 제공하지 않는다")
    void omitsUnusedTopLevelFacets(int page, String keyword) throws Exception {
        mockMvc.perform(get("/api/products").param("page", String.valueOf(page)).param("keyword", keyword))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items").isArray())
            .andExpect(jsonPath("$.pagination").exists())
            .andExpect(jsonPath("$.categories").doesNotHaveJsonPath())
            .andExpect(jsonPath("$.skinTypes").doesNotHaveJsonPath());
    }

    @ParameterizedTest
    @CsvSource({"true,1", "false,5"})
    @DisplayName("민감성 선택은 결과에만 적용하고 피부 후보를 계산할 때는 제외한다")
    void excludesSensitivityFromSkinOptions(boolean sensitive, int total) throws Exception {
        mockMvc.perform(get("/api/products").param("sensitiveSkin", String.valueOf(sensitive)).param("size", "1"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.pagination.totalElements").value(total))
            .andExpect(
                jsonPath("$.filterOptions.skinTypes[*].code").value(containsInAnyOrder("DRY", "OILY", "COMBINATION"))
            )
            .andExpect(jsonPath("$.filterOptions.sensitiveSkin").value(true));
    }

    @ParameterizedTest
    @CsvSource({"OILY", "COMBINATION"})
    @DisplayName("피부 후보는 타입과 민감성 조건을 함께 풀고 나머지 검색·필터 조건은 지킨다")
    void excludesWholeSkinGroupFromOptions(String skinType) throws Exception {
        MultiValueMap<String, String> params = new LinkedMultiValueMap<>();
        params.add("skinType", skinType);
        params.add("sensitiveSkin", "true");
        params.add("brandIds", "3");
        params.add("categoryIds", "2");
        params.add("keyword", "토너");
        params.add("moistureLevel", "2");
        params.add("oilLevel", "0");
        JsonNode actual = response(params);
        params.remove("skinType");
        params.remove("sensitiveSkin");
        JsonNode expected = response(params);

        assertThat(actual.path("filterOptions").path("skinTypes"))
            .isEqualTo(expected.path("filterOptions").path("skinTypes"));
        assertThat(actual.path("filterOptions").path("skinTypes").size()).isEqualTo(3);
        assertThat(actual.path("filterOptions").path("sensitiveSkin").asBoolean()).isFalse();
        assertThat(actual.path("filterOptions").path("sensitiveSkin"))
            .isEqualTo(expected.path("filterOptions").path("sensitiveSkin"));
    }

    @Test
    @DisplayName("피부 조건으로 결과가 없어도 추가할 수 있는 피부 타입과 민감성 후보는 남긴다")
    void keepsSkinOptionsWhenSkinSelectionHasNoResults() throws Exception {
        mockMvc.perform(
            get("/api/products").param("keyword", "토너")
                .param("brandIds", "1").param("skinType", "OILY")
        )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items").isEmpty())
            .andExpect(jsonPath("$.pagination.totalElements").value(0))
            .andExpect(jsonPath("$.filterOptions.skinTypes[*].code").value(containsInAnyOrder("DRY")))
            .andExpect(jsonPath("$.filterOptions.sensitiveSkin").value(true));
    }

    @Test
    @DisplayName("민감성 단독 선택은 브랜드와 카테고리 후보를 민감성 제품으로 제한한다")
    void keepsSensitivityForOtherOptions() throws Exception {
        mockMvc.perform(get("/api/products").param("sensitiveSkin", "true"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.filterOptions.brands[*].id").value(containsInAnyOrder(1)))
            .andExpect(jsonPath("$.filterOptions.categories[0].productCount").value(1))
            .andExpect(jsonPath("$.filterOptions.categories[0].children[*].id").value(containsInAnyOrder(2)));
    }

    @ParameterizedTest
    @CsvSource({"토너,true", "래디언스,false", "레티놀 콜라겐,false", "없는제품,false"})
    @DisplayName("검색 결과와 민감성 제품 유무가 달라도 피부 후보 범위의 민감성 여부를 반환한다")
    void reportsSensitiveCandidateAvailability(String keyword, boolean expected) throws Exception {
        mockMvc.perform(get("/api/products").param("keyword", keyword).param("sensitiveSkin", "true"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.filterOptions.sensitiveSkin").value(expected));
    }

    @Test
    @Transactional
    @DisplayName("일반 피부 타입이 없는 민감성 제품도 OR 검색과 민감성 후보에 포함한다")
    void includesSensitiveProductsWithoutSkinTypes() throws Exception {
        jdbc.update("update product set is_sensitive_skin = true where id = 7");

        mockMvc.perform(
            get("/api/products").param("keyword", "레티놀 콜라겐")
                .param("skinType", "OILY").param("sensitiveSkin", "true")
        )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items[*].id").value(containsInAnyOrder(7)))
            .andExpect(jsonPath("$.skinTypes").doesNotHaveJsonPath())
            .andExpect(jsonPath("$.filterOptions.skinTypes").isEmpty())
            .andExpect(jsonPath("$.filterOptions.sensitiveSkin").value(true));
        mockMvc.perform(
            get("/api/products/count").param("keyword", "레티놀 콜라겐")
                .param("skinType", "OILY").param("sensitiveSkin", "true")
        )
            .andExpect(status().isOk()).andExpect(jsonPath("$.count").value(1));
    }

    @Test
    void onlyFirstPageIncludesOptions() throws Exception {
        mockMvc.perform(get("/api/products").param("page", "1").param("size", "1"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.filterOptions.brands").isNotEmpty())
            .andExpect(jsonPath("$.items[0].brand.id").isNumber())
            .andExpect(jsonPath("$.brands").doesNotHaveJsonPath());
        mockMvc.perform(get("/api/products").param("page", "2").param("size", "1"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.filterOptions").doesNotHaveJsonPath())
            .andExpect(jsonPath("$.brands").doesNotHaveJsonPath());
    }

    private JsonNode response(MultiValueMap<String, String> params) throws Exception {
        return mapper.readTree(
            mockMvc.perform(get("/api/products").params(params))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString()
        );
    }
}
