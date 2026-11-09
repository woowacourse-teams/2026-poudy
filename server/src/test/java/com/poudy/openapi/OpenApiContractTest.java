package com.poudy.openapi;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.containsInAnyOrder;
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
import org.springframework.test.web.servlet.ResultActions;

@SpringBootTest
@AutoConfigureMockMvc
class OpenApiContractTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void documentsConcernItemsAsDiscriminatedUnion() throws Exception {
        mockMvc.perform(get("/v3/api-docs"))
            .andExpect(status().isOk())
            .andExpect(
                jsonPath("$.components.schemas.ConcernItemResponse.oneOf[*].$ref").value(
                    containsInAnyOrder(
                        "#/components/schemas/IngredientItemResponse",
                        "#/components/schemas/IngredientGroupItemResponse"
                    )
                )
            )
            .andExpect(jsonPath("$.components.schemas.ConcernItemResponse.discriminator.propertyName").value("type"))
            .andExpect(
                jsonPath("$.components.schemas.ConcernItemResponse.discriminator.mapping.INGREDIENT")
                    .value("#/components/schemas/IngredientItemResponse")
            )
            .andExpect(
                jsonPath("$.components.schemas.ConcernItemResponse.discriminator.mapping.INGREDIENT_GROUP")
                    .value("#/components/schemas/IngredientGroupItemResponse")
            )
            .andExpect(
                jsonPath("$.components.schemas.IngredientItemResponse.required")
                    .value(containsInAnyOrder("type", "id", "koreanName"))
            )
            .andExpect(
                jsonPath("$.components.schemas.IngredientItemResponse.properties.type.enum")
                    .value(contains("INGREDIENT"))
            )
            .andExpect(
                jsonPath("$.components.schemas.IngredientGroupItemResponse.required")
                    .value(containsInAnyOrder("type", "code", "name", "ingredients"))
            )
            .andExpect(
                jsonPath("$.components.schemas.IngredientGroupItemResponse.properties.type.enum")
                    .value(contains("INGREDIENT_GROUP"))
            )
            .andExpect(
                jsonPath("$.components.schemas.ProductPartResponse.properties.concernGroups.type").value("array")
            )
            .andExpect(
                jsonPath("$.components.schemas.ProductPartResponse.properties.skinEffectGroups").doesNotExist()
            )
            .andExpect(jsonPath("$.components.schemas.ProductPartResponse.required", hasItem("concernGroups")))
            .andExpect(jsonPath("$.components.schemas.ConcernEffectResponse.properties.items").doesNotExist())
            .andExpect(
                jsonPath("$.components.schemas.ConcernGroupResponse.required")
                    .value(containsInAnyOrder("code", "name", "effects", "items"))
            )
            .andExpect(jsonPath("$.components.schemas.ConcernGroupResponse.properties.code.example").value("DRYNESS"))
            .andExpect(jsonPath("$.components.schemas.ConcernGroupResponse.properties.name.example").value("건조·당김"))
            .andExpect(
                jsonPath("$.components.schemas.ConcernGroupResponse.properties.items.example[0].type")
                    .value("INGREDIENT")
            )
            .andExpect(
                jsonPath("$.components.schemas.ConcernGroupResponse.properties.items.example[1].type")
                    .value("INGREDIENT_GROUP")
            )
            .andExpect(
                jsonPath("$.components.schemas.ConcernGroupResponse.properties.items.example[1].ingredients[*].id")
                    .value(contains(7130, 7131))
            );
    }

    @Test
    void documentsShelfRatingPreviewContract() throws Exception {
        ResultActions result = mockMvc.perform(get("/v3/api-docs")).andExpect(status().isOk());
        String member = "$.paths['/api/users/me/shelf/ingredient-analysis/preview'].get";
        String guest = "$.paths['/api/shelf/ingredient-analysis/preview'].post";
        String schema = "$.components.schemas.IngredientAnalysisPreviewResponse";

        result.andExpect(jsonPath(member + ".responses['404']").exists())
            .andExpect(jsonPath(member + ".responses['401']").exists())
            .andExpect(jsonPath(member + ".parameters[?(@.name=='productId')].required").value(contains(true)))
            .andExpect(
                jsonPath(member + ".parameters[?(@.name=='productId')].schema.exclusiveMinimum").value(contains(0))
            )
            .andExpect(jsonPath(guest + ".responses['400']").exists())
            .andExpect(jsonPath(guest + ".responses['401']").doesNotExist())
            .andExpect(
                jsonPath(schema + ".required").value(
                    containsInAnyOrder(
                        "withoutRating",
                        "ratedGood",
                        "ratedBad",
                        "ratedBadAcrossSkinTypes",
                        "productCautionIngredients"
                    )
                )
            )
            .andExpect(
                jsonPath(schema + ".properties.ratedBadAcrossSkinTypes.anyOf[0]['$ref']")
                    .value("#/components/schemas/IngredientAnalysisResponse")
            )
            .andExpect(jsonPath(schema + ".properties.ratedBadAcrossSkinTypes.anyOf[1].type").value("null"))
            .andExpect(
                jsonPath("$.components.schemas.GuestIngredientAnalysisPreviewRequest.properties.items.maxItems")
                    .value(100)
            );
    }

    @Test
    void documentsSimilaritySizeSortAndOptionalPriceInformation() throws Exception {
        var result = mockMvc.perform(get("/v3/api-docs")).andExpect(status().isOk());
        for (String path : new String[] {
                "/api/products/{productId}/similarities",
                "/api/users/me/products/{productId}"}) {
            String parameters = "$.paths['" + path + "'].get.parameters";
            result.andExpect(jsonPath(parameters + "[?(@.name=='size')].schema.default").value(contains(3)))
                .andExpect(jsonPath(parameters + "[?(@.name=='size')].schema.minimum").value(contains(1)))
                .andExpect(jsonPath(parameters + "[?(@.name=='size')].schema.maximum").value(contains(10)))
                .andExpect(
                    jsonPath(parameters + "[?(@.name=='sort')].schema['$ref']")
                        .value(contains("#/components/schemas/ProductSimilaritySort"))
                );
        }
        result.andExpect(
            jsonPath("$.components.schemas.ProductSimilaritySort.enum")
                .value(contains("SIMILARITY", "UNIT_PRICE_ASC"))
        )
            .andExpect(
                jsonPath("$.components.schemas.UnitPriceComparison.enum")
                    .value(contains("CHEAPER", "SAME", "MORE_EXPENSIVE", "UNAVAILABLE"))
            );
        for (String field : new String[] {"unitPrice", "unitPriceDifferencePercent", "unitPriceComparison"}) {
            result.andExpect(jsonPath("$.components.schemas.SimilarProductResponse.properties." + field).exists())
                .andExpect(jsonPath("$.components.schemas.SimilarProductResponse.required", not(hasItem(field))));
        }
    }

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
                {"ProductDetailResponse", "selectedPart", "ProductPartResponse"}
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
        ResultActions result = mockMvc.perform(get("/v3/api-docs"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.components.schemas.ProductPageResponse.properties.brands").doesNotHaveJsonPath())
            .andExpect(jsonPath("$.components.schemas.ProductPageResponse.properties.categories").doesNotHaveJsonPath())
            .andExpect(jsonPath("$.components.schemas.ProductPageResponse.properties.skinTypes").doesNotHaveJsonPath())
            .andExpect(
                jsonPath("$.components.schemas.ProductPageResponse.properties.selectedFilters").doesNotHaveJsonPath()
            )
            .andExpect(
                jsonPath("$.components.schemas.ProductPageResponse.required")
                    .value(containsInAnyOrder("items", "pagination"))
            )
            .andExpect(
                jsonPath("$.components.schemas.ProductFilterOptionsResponse.properties.categories.items.$ref")
                    .value("#/components/schemas/CategoryResponse")
            )
            .andExpect(
                jsonPath("$.components.schemas.ProductFilterOptionsResponse.properties.skinOptions.items.$ref")
                    .value("#/components/schemas/ProductSkinOptionResponse")
            )
            .andExpect(jsonPath("$.components.schemas.ProductDetailResponse.properties.categories").exists())
            .andExpect(
                jsonPath("$.components.schemas.ProductResponse.properties.brand.$ref")
                    .value("#/components/schemas/BrandResponse")
            )
            .andExpect(
                jsonPath("$.components.schemas.ProductFilterOptionsResponse.properties.brands.items.$ref")
                    .value("#/components/schemas/ProductBrandOptionResponse")
            )
            .andExpect(jsonPath("$.components.schemas.ProductFilterOptionsResponse.required", hasItem("skinOptions")))
            .andExpect(
                jsonPath("$.components.schemas.ProductFilterOptionsResponse.properties.sensitiveSkin")
                    .doesNotHaveJsonPath()
            )
            .andExpect(
                jsonPath("$.components.schemas.ProductFilterOptionsResponse.properties.skinChoices")
                    .doesNotHaveJsonPath()
            )
            .andExpect(jsonPath("$.components.schemas.BrandResponse.properties.productCount").doesNotHaveJsonPath())
            .andExpect(
                jsonPath("$.components.schemas.SkinChoiceResponse.properties.productCount").doesNotHaveJsonPath()
            )
            .andExpect(
                jsonPath("$.components.schemas.SkinOptionsResponse.properties.items.items.$ref")
                    .value("#/components/schemas/SkinChoiceResponse")
            )
            .andExpect(jsonPath("$.components.schemas.SkinOptionsResponse.required", contains("items")))
            .andExpect(jsonPath("$.paths['/api/skin-options']").exists())
            .andExpect(jsonPath("$.paths['/api/skin-types']").doesNotHaveJsonPath())
            .andExpect(
                jsonPath("$.components.schemas.SkinChoice.enum")
                    .value(contains("DRY", "OILY", "COMBINATION", "SENSITIVE"))
            )
            .andExpect(
                jsonPath("$.components.schemas.SkinType.enum")
                    .value(contains("DRY", "OILY", "COMBINATION"))
            );
        for (String schema : new String[] {
                "ProductBrandOptionResponse",
                "ProductSkinOptionResponse"}) {
            result.andExpect(jsonPath("$.components.schemas." + schema + ".required", hasItem("productCount")));
        }
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
                {"SkinChoiceResponse", "code", "SkinChoice"},
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
