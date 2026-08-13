package com.poudy.exception;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.poudy.product.controller.ProductController;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(ProductController.class)
class GlobalExceptionHandlerWebTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void invalidRequestReportsQueryParameterCode() throws Exception {
        mockMvc.perform(get("/api/products").param("size", "0")).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value(ErrorCode.INVALID_QUERY_PARAMETER.name()));
    }

    @Test
    void unknownEndpointReportsEndpointCode() throws Exception {
        mockMvc.perform(get("/api/unknown")).andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value(ErrorCode.ENDPOINT_NOT_FOUND.name()));
    }

    @Test
    void conflictingIngredientFiltersReportConflict() throws Exception {
        mockMvc.perform(
                get("/api/products").param("includeIngredientIds", "1005").param("excludeIngredientIds", "1005"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value(ErrorCode.CONFLICTING_INGREDIENT_FILTER.name()));
    }

    @Test
    void conflictingIngredientFiltersReportConflictOnCount() throws Exception {
        mockMvc.perform(
                get("/api/products/count").param("includeIngredientIds", "1005").param("excludeIngredientIds", "1005"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value(ErrorCode.CONFLICTING_INGREDIENT_FILTER.name()));
    }

    @Test
    void disjointIngredientFiltersSucceed() throws Exception {
        mockMvc.perform(
                get("/api/products").param("includeIngredientIds", "1005").param("excludeIngredientIds", "1001"))
                .andExpect(status().isOk());
    }

    @Test
    void unsupportedMethodReportsUnsupportedCode() throws Exception {
        mockMvc.perform(post("/api/products")).andExpect(status().isMethodNotAllowed())
                .andExpect(jsonPath("$.code").value(ErrorCode.UNSUPPORTED_REQUEST.name()));
    }
}
