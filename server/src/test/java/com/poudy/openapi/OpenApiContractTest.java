package com.poudy.openapi;

import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
class OpenApiContractTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void documentsOptionalFieldsAndRemovesUnusedAmount() throws Exception {
        var result = mockMvc.perform(get("/v3/api-docs")).andExpect(status().isOk());
        for (String schema : new String[] {"ProductPartSummaryResponse", "ProductPartResponse"}) {
            result.andExpect(jsonPath("$.components.schemas." + schema + ".required", not(hasItem("name"))))
                .andExpect(jsonPath("$.components.schemas." + schema + ".properties.name.type").value("string"));
        }
        for (String schema : new String[] {"IngredientGroupResponse", "IngredientGroupMemberResponse"}) {
            result.andExpect(jsonPath("$.components.schemas." + schema + ".required", not(hasItem("englishName"))))
                .andExpect(
                    jsonPath("$.components.schemas." + schema + ".properties.englishName.type").value("string")
                );
        }
        result.andExpect(jsonPath("$.components.schemas.ProductDetailResponse.required", not(hasItem("selectedPart"))))
            .andExpect(
                jsonPath("$.components.schemas.SkinEffectItemResponse.required", not(hasItem("ingredientGroup")))
            )
            .andExpect(jsonPath("$.components.schemas.RankingItem.required", not(hasItem("change"))))
            .andExpect(
                jsonPath("$.components.schemas.ProductIngredientResponse.properties.disclosedAmount").doesNotExist()
            )
            .andExpect(jsonPath("$.components.schemas.DisclosedAmountResponse").doesNotExist());
    }

    @Test
    void documentsPositiveIndexesAndNonemptyShareText() throws Exception {
        mockMvc.perform(get("/v3/api-docs"))
            .andExpect(status().isOk())
            .andExpect(
                jsonPath("$.components.schemas.ProductSuggestionMatchResponse.properties.endIndexExclusive.minimum")
                    .value(1)
            )
            .andExpect(
                jsonPath("$.components.schemas.IngredientSuggestionMatchResponse.properties.endIndexExclusive.minimum")
                    .value(1)
            )
            .andExpect(jsonPath("$.paths['/api/products/share-matches'].get.parameters[0].schema.minLength").value(1));
    }
}
