package com.poudy.exception;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.poudy.common.dto.PaginationRequest;
import com.poudy.product.controller.ProductController;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(ProductController.class)
@DisplayName("오류 응답 계약")
class GlobalExceptionHandlerWebTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("잘못된 요청 값은 400 과 쿼리 파라미터 코드로 응답한다")
    void invalidRequestReportsQueryParameterCode() throws Exception {
        mockMvc.perform(get("/api/products").param("size", "0")).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value(ErrorCode.INVALID_QUERY_PARAMETER.name()));
    }

    @Test
    @DisplayName("페이지 크기가 상한을 넘으면 400 으로 거절한다")
    void sizeAboveMaximumReportsQueryParameterCode() throws Exception {
        mockMvc.perform(get("/api/products").param("size", String.valueOf(PaginationRequest.MAX_SIZE + 1)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value(ErrorCode.INVALID_QUERY_PARAMETER.name()));
    }

    @Test
    @DisplayName("없는 경로는 404 와 경로 코드로 응답한다")
    void unknownEndpointReportsEndpointCode() throws Exception {
        mockMvc.perform(get("/api/unknown")).andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value(ErrorCode.ENDPOINT_NOT_FOUND.name()));
    }

    @Test
    @DisplayName("같은 성분을 포함과 제외에 함께 쓰면 409 로 거절한다")
    void conflictingIngredientFiltersReportConflict() throws Exception {
        mockMvc.perform(
                get("/api/products").param("includeIngredientIds", "1005").param("excludeIngredientIds", "1005"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value(ErrorCode.CONFLICTING_INGREDIENT_FILTER.name()));
    }

    @Test
    @DisplayName("개수 조회도 목록과 같은 판정으로 409 를 반환한다")
    void conflictingIngredientFiltersReportConflictOnCount() throws Exception {
        mockMvc.perform(
                get("/api/products/count").param("includeIngredientIds", "1005").param("excludeIngredientIds", "1005"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value(ErrorCode.CONFLICTING_INGREDIENT_FILTER.name()));
    }

    @Test
    @DisplayName("포함과 제외가 겹치지 않으면 정상 응답한다")
    void disjointIngredientFiltersSucceed() throws Exception {
        mockMvc.perform(
                get("/api/products").param("includeIngredientIds", "1005").param("excludeIngredientIds", "1001"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("지원하지 않는 메서드는 405 로 응답한다")
    void unsupportedMethodReportsUnsupportedCode() throws Exception {
        mockMvc.perform(post("/api/products")).andExpect(status().isMethodNotAllowed())
                .andExpect(jsonPath("$.code").value(ErrorCode.UNSUPPORTED_REQUEST.name()));
    }
}
