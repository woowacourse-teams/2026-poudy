package com.poudy.openapi;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.hamcrest.Matchers.hasItem;
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
    void documentsNullableFieldsAsRequired() throws Exception {
        var result = mockMvc.perform(get("/v3/api-docs")).andExpect(status().isOk());
        for (String schema : new String[] {"ProductPartSummaryResponse", "ProductPartResponse"}) {
            result.andExpect(jsonPath("$.components.schemas." + schema + ".required", hasItem("name")))
                .andExpect(
                    jsonPath("$.components.schemas." + schema + ".properties.name.type")
                        .value(contains("string", "null"))
                );
        }
        for (String schema : new String[] {"IngredientGroupResponse", "IngredientGroupMemberResponse"}) {
            result.andExpect(jsonPath("$.components.schemas." + schema + ".required", hasItem("englishName")))
                .andExpect(
                    jsonPath("$.components.schemas." + schema + ".properties.englishName.type")
                        .value(contains("string", "null"))
                );
        }
        String[][] references = {
                {"ProductDetailResponse", "selectedPart", "ProductPartResponse"},
                {"SkinEffectItemResponse", "ingredientGroup", "IngredientGroupSummaryResponse"}
        };
        for (String[] reference : references) {
            String property = "$.components.schemas." + reference[0] + ".properties." + reference[1];
            result.andExpect(jsonPath("$.components.schemas." + reference[0] + ".required", hasItem(reference[1])))
                .andExpect(jsonPath(property + ".anyOf[0].$ref").value("#/components/schemas/" + reference[2]))
                .andExpect(jsonPath(property + ".anyOf[1].type").value("null"));
        }
    }

    @Test
    void documentsRankingChangeAsRequiredReference() throws Exception {
        mockMvc.perform(get("/v3/api-docs"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.components.schemas.RankingItem.required", hasItem("change")))
            .andExpect(
                jsonPath("$.components.schemas.RankingItem.properties.change.$ref")
                    .value("#/components/schemas/RankingChangeItem")
            )
            .andExpect(jsonPath("$.components.schemas.RankingItem.properties.change.anyOf").doesNotExist());
    }

    @Test
    void removesUnusedAmount() throws Exception {
        mockMvc.perform(get("/v3/api-docs"))
            .andExpect(status().isOk())
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

    @Test
    void documentsSocialLoginStartAsRedirect() throws Exception {
        String operation = "$.paths['/api/oauth2/authorization/{provider}'].get";

        mockMvc.perform(get("/v3/api-docs"))
            .andExpect(status().isOk())
            .andExpect(jsonPath(operation + ".tags", contains("인증")))
            .andExpect(jsonPath(operation + ".parameters[0].schema.enum", containsInAnyOrder("kakao", "google")))
            .andExpect(jsonPath(operation + ".responses['302'].headers.Location").exists())
            .andExpect(jsonPath(operation + ".responses['404']").exists())
            .andExpect(jsonPath(operation + ".responses['400']").doesNotExist());
    }
}
