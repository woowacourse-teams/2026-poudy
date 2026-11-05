package com.poudy.openapi;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.hamcrest.Matchers.hasItem;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@DisplayName("제품 비교 OpenAPI 계약")
class ProductComparisonOpenApiTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void documentsRequestAndOptionalLoginErrors() throws Exception {
        mockMvc.perform(get("/v3/api-docs"))
            .andExpect(status().isOk())
            .andExpect(
                jsonPath(
                    "$.paths['/api/products/comparison'].get.parameters[?(@.name == 'productIds')].required",
                    contains(true)
                )
            )
            .andExpect(
                jsonPath(
                    "$.paths['/api/products/comparison'].get.parameters[?(@.name == 'productIds')].schema.minItems",
                    contains(1)
                )
            )
            .andExpect(
                jsonPath(
                    "$.paths['/api/products/comparison'].get.parameters[?(@.name == 'productIds')].schema.maxItems",
                    contains(3)
                )
            )
            .andExpect(
                jsonPath(
                    "$.paths['/api/products/comparison'].get.parameters[?(@.name == 'productIds')].schema.uniqueItems",
                    contains(true)
                )
            )
            .andExpect(
                jsonPath(
                    "$.paths['/api/products/comparison'].get.parameters[?(@.name == 'partIds')].style",
                    contains("deepObject")
                )
            )
            .andExpect(
                jsonPath(
                    "$.paths['/api/products/comparison'].get.parameters[?(@.name == 'partIds')].explode",
                    contains(true)
                )
            )
            .andExpect(jsonPath("$.paths['/api/products/comparison'].get.security").doesNotExist())
            .andExpect(jsonPath("$.paths['/api/products/comparison'].get.responses['400']").exists())
            .andExpect(jsonPath("$.paths['/api/products/comparison'].get.responses['401']").exists())
            .andExpect(
                jsonPath(
                    "$.paths['/api/products/comparison'].get.responses['404'].content['application/problem+json'].examples.PRODUCT_NOT_FOUND"
                ).exists()
            )
            .andExpect(
                jsonPath(
                    "$.paths['/api/products/comparison'].get.responses['404'].content['application/problem+json'].examples.PRODUCT_PART_NOT_FOUND"
                ).exists()
            );
    }

    @Test
    void documentsFilterStateAndRequiredNullableFields() throws Exception {
        var result = mockMvc.perform(get("/v3/api-docs")).andExpect(status().isOk())
            .andExpect(
                jsonPath(
                    "$.components.schemas.ProductComparisonResponse.required",
                    contains("items")
                )
            )
            .andExpect(
                jsonPath(
                    "$.components.schemas.ProductComparisonFilterStatus.enum",
                    contains("GUEST", "NO_FILTER", "NO_MATCH", "MATCH")
                )
            )
            .andExpect(jsonPath("$.components.schemas.ProductComparisonItemResponse.required", hasItem("selectedPart")))
            .andExpect(
                jsonPath("$.components.schemas.ProductComparisonItemResponse.properties.selectedPart.anyOf[0].$ref")
                    .value("#/components/schemas/ProductComparisonPartResponse")
            )
            .andExpect(
                jsonPath("$.components.schemas.ProductComparisonItemResponse.properties.selectedPart.anyOf[1].type")
                    .value("null")
            );
        for (String field : new String[] {"name", "moistureLevel", "oilLevel"}) {
            result.andExpect(jsonPath("$.components.schemas.ProductComparisonPartResponse.required", hasItem(field)))
                .andExpect(
                    jsonPath(
                        "$.components.schemas.ProductComparisonPartResponse.properties." + field + ".type",
                        hasItem("null")
                    )
                );
        }
        result
            .andExpect(
                jsonPath("$.components.schemas.ProductComparisonResponse.properties.myFilterStatus").doesNotExist()
            )
            .andExpect(
                jsonPath("$.components.schemas.ProductComparisonPartResponse.required", hasItem("myFilterStatus"))
            )
            .andExpect(
                jsonPath("$.components.schemas.ProductComparisonPartResponse.properties.myFilterStatus.$ref")
                    .value("#/components/schemas/ProductComparisonFilterStatus")
            )
            .andExpect(
                jsonPath("$.components.schemas.ProductComparisonPartResponse.required", hasItem("myFilterIngredients"))
            )
            .andExpect(
                jsonPath(
                    "$.components.schemas.ProductVariantResponse.required",
                    containsInAnyOrder("id", "price", "volumeValue", "volumeUnit", "status")
                )
            )
            .andExpect(
                jsonPath("$.components.schemas.ProductComparisonItemResponse.properties.variants.items.$ref")
                    .value("#/components/schemas/ProductVariantResponse")
            );
    }

    @Test
    void documentsRequiredProductMetadata() throws Exception {
        mockMvc.perform(get("/v3/api-docs"))
            .andExpect(status().isOk())
            .andExpect(
                jsonPath(
                    "$.components.schemas.ProductComparisonItemResponse.required",
                    containsInAnyOrder(
                        "id",
                        "name",
                        "brand",
                        "categories",
                        "marks",
                        "imageUrl",
                        "variants",
                        "sensitiveSkin",
                        "productParts",
                        "selectedPart",
                        "updatedAt"
                    )
                )
            )
            .andExpect(
                jsonPath("$.components.schemas.ProductComparisonItemResponse.properties.marks.items.$ref")
                    .value("#/components/schemas/MarkResponse")
            )
            .andExpect(
                jsonPath("$.components.schemas.ProductComparisonItemResponse.properties.categories.items.$ref")
                    .value("#/components/schemas/CategoryPathResponse")
            )
            .andExpect(
                jsonPath("$.components.schemas.ProductComparisonItemResponse.properties.updatedAt.format")
                    .value("date-time")
            );
    }
}
