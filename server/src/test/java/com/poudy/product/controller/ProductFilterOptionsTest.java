package com.poudy.product.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest
@AutoConfigureMockMvc
class ProductFilterOptionsTest {

    @Autowired
    private MockMvc mockMvc;

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
                .isEqualTo(expected.path(field));
        }
    }

    @Test
    void keepsOptionsWhenActualResultsAreEmpty() throws Exception {
        mockMvc.perform(get("/api/products").param("brandIds", "999999"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items").isEmpty())
            .andExpect(jsonPath("$.brands").isEmpty())
            .andExpect(jsonPath("$.filterOptions.brands").isNotEmpty())
            .andExpect(jsonPath("$.filterOptions.categories").isEmpty())
            .andExpect(jsonPath("$.filterOptions.skinTypes").isEmpty());
    }

    @Test
    void onlyFirstPageIncludesOptions() throws Exception {
        mockMvc.perform(get("/api/products").param("page", "1").param("size", "1"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.filterOptions.brands").isNotEmpty());
        mockMvc.perform(get("/api/products").param("page", "2").param("size", "1"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.filterOptions").doesNotHaveJsonPath())
            .andExpect(jsonPath("$.brands").isNotEmpty());
    }

    private JsonNode response(MultiValueMap<String, String> params) throws Exception {
        return mapper.readTree(
            mockMvc.perform(get("/api/products").params(params))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString()
        );
    }
}
