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
import org.springframework.test.web.servlet.ResultActions;

@SpringBootTest
@AutoConfigureMockMvc
class OpenApiContractTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void documentsMyFilterNames() throws Exception {
        mockMvc.perform(get("/v3/api-docs"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.paths['/api/users/me/my-filter'].get").exists())
            .andExpect(jsonPath("$.paths['/api/users/me/my-filter/ingredients'].post").exists())
            .andExpect(jsonPath("$.paths['/api/users/me/my-filter/ingredients'].delete").exists())
            .andExpect(jsonPath("$.paths['/api/users/me/skin-filter']").doesNotExist())
            .andExpect(jsonPath("$.paths['/api/users/me/skin-filter/ingredients']").doesNotExist())
            .andExpect(jsonPath("$.components.schemas.MyFilterResponse").exists())
            .andExpect(jsonPath("$.components.schemas.SkinFilterResponse").doesNotExist())
            .andExpect(jsonPath("$.components.schemas.UserProductResponse.required", hasItem("myFilterEmpty")))
            .andExpect(jsonPath("$.components.schemas.UserProductResponse.properties.skinFilterEmpty").doesNotExist())
            .andExpect(
                jsonPath(
                    "$.components.schemas.UserSimilarProductResponse.required",
                    hasItem("containsMyFilterIngredient")
                )
            )
            .andExpect(
                jsonPath("$.components.schemas.UserSimilarProductResponse.properties.containsSkinFilterIngredient")
                    .doesNotExist()
            );
    }

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
    void documentsProductFacetsOnlyInFilterOptions() throws Exception {
        mockMvc.perform(get("/v3/api-docs"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.components.schemas.ProductPageResponse.properties.brands").doesNotHaveJsonPath())
            .andExpect(jsonPath("$.components.schemas.ProductPageResponse.properties.categories").doesNotHaveJsonPath())
            .andExpect(jsonPath("$.components.schemas.ProductPageResponse.properties.skinTypes").doesNotHaveJsonPath())
            .andExpect(
                jsonPath("$.components.schemas.ProductPageResponse.required")
                    .value(containsInAnyOrder("items", "pagination"))
            )
            .andExpect(
                jsonPath("$.components.schemas.ProductFilterOptionsResponse.properties.categories.items.$ref")
                    .value("#/components/schemas/CategoryResponse")
            )
            .andExpect(
                jsonPath("$.components.schemas.ProductFilterOptionsResponse.properties.skinTypes.items.$ref")
                    .value("#/components/schemas/SkinTypeResponse")
            )
            .andExpect(jsonPath("$.components.schemas.ProductDetailResponse.properties.categories").exists())
            .andExpect(
                jsonPath("$.components.schemas.ProductResponse.properties.brand.$ref")
                    .value("#/components/schemas/BrandResponse")
            )
            .andExpect(
                jsonPath("$.components.schemas.ProductFilterOptionsResponse.properties.brands.items.$ref")
                    .value("#/components/schemas/BrandResponse")
            );
    }

    @Test
    void documentsCautionGroupCodeAsRequiredString() throws Exception {
        mockMvc.perform(get("/v3/api-docs"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.components.schemas.ExcludeGroupResponse.required", hasItem("code")))
            .andExpect(jsonPath("$.components.schemas.ExcludeGroupResponse.properties.code.type").value("string"));
    }

    @Test
    void documentsIngredientCautionsAsRequiredArray() throws Exception {
        mockMvc.perform(get("/v3/api-docs"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.components.schemas.ProductIngredientResponse.required", hasItem("cautions")))
            .andExpect(
                jsonPath("$.components.schemas.ProductIngredientResponse.properties.cautions.type").value("array")
            )
            .andExpect(
                jsonPath("$.components.schemas.ProductIngredientResponse.properties.cautions.items.$ref")
                    .value("#/components/schemas/IngredientCautionResponse")
            )
            .andExpect(jsonPath("$.components.schemas.IngredientCautionResponse.required", contains("code", "label")))
            .andExpect(jsonPath("$.components.schemas.IngredientCautionResponse.properties.code.type").value("string"))
            .andExpect(
                jsonPath("$.components.schemas.IngredientCautionResponse.properties.label.type").value("string")
            );
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

    @Test
    void documentsEnumsAsNamedSchemas() throws Exception {
        ResultActions result = mockMvc.perform(get("/v3/api-docs")).andExpect(status().isOk());
        String[][] references = {
                {"SkinTypeResponse", "code", "SkinType"},
                {"ShareMatchResponse", "status", "ShareMatchStatus"},
                {"ProductSuggestionMatchResponse", "field", "ProductMatchField"},
                {"IngredientSuggestionMatchResponse", "field", "IngredientMatchField"},
                {"FeedbackRequest", "type", "FeedbackType"},
                {"AdminFeedbackResponse", "type", "FeedbackSubjectType"},
                {"AdminFeedbackResponse", "status", "FeedbackStatus"},
                {"AdminProductRequestResponse", "status", "ProductRequestStatus"},
                {"ProblemDetail", "code", "ErrorCode"}
        };
        for (String[] reference : references) {
            result.andExpect(
                jsonPath("$.components.schemas." + reference[0] + ".properties." + reference[1] + ".$ref")
                    .value("#/components/schemas/" + reference[2])
            );
        }
        result.andExpect(jsonPath("$.components.schemas.ProductSort.default").value("DEFAULT"))
            .andExpect(jsonPath("$.components.schemas.ExcludeCode.enum", hasItem("SULFATES")))
            .andExpect(jsonPath("$.components.schemas.ErrorCode.enum", hasItem("CONFLICTING_INGREDIENT_FILTER")));
    }
}
