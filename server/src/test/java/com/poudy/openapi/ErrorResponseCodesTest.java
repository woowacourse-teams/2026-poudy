package com.poudy.openapi;

import static org.assertj.core.api.Assertions.assertThat;

import com.poudy.exception.ErrorCode;
import io.swagger.v3.oas.models.PathItem.HttpMethod;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("OpenAPI 오류 응답 코드 설정")
class ErrorResponseCodesTest {

    @Test
    @DisplayName("관리자 로그인 잘못된 요청은 본문 오류 코드만 문서화한다")
    void documentsInvalidRequestBodyForAdminLogin() {
        assertThat(ErrorResponseCodes.badRequest("/api/admin/login", HttpMethod.POST))
            .containsExactly(ErrorCode.INVALID_REQUEST_BODY);
    }

    @Test
    @DisplayName("관리자 요청은 쿼리와 본문 오류 코드를 문서화한다")
    void documentsAdminRequestErrors() {
        assertThat(ErrorResponseCodes.badRequest("/api/admin/feedbacks/{feedbackId}/status", HttpMethod.PATCH))
            .containsExactly(ErrorCode.INVALID_QUERY_PARAMETER, ErrorCode.INVALID_REQUEST_BODY);
    }

    @Test
    @DisplayName("관리자 GET 요청은 본문 오류를 문서화하지 않는다")
    void documentsOnlyQueryErrorsForAdminReads() {
        for (String path : new String[] {
                "/api/admin/feedbacks",
                "/api/admin/feedbacks/{feedbackId}",
                "/api/admin/product-requests",
                "/api/admin/product-requests/{requestId}"
        }) {
            assertThat(ErrorResponseCodes.badRequest(path, HttpMethod.GET))
                .containsExactly(ErrorCode.INVALID_QUERY_PARAMETER);
        }
    }

    @Test
    @DisplayName("검색어 집계 요청은 본문 오류를 문서화한다")
    void documentsSearchKeywordBodyError() {
        assertThat(ErrorResponseCodes.badRequest("/api/search-keywords", HttpMethod.POST))
            .containsExactly(ErrorCode.INVALID_REQUEST_BODY);
    }

    @Test
    @DisplayName("제품 상세는 제품과 구성품 없음 오류를 모두 문서화한다")
    void documentsProductPartNotFound() {
        assertThat(ErrorResponseCodes.notFound("/api/products/{productId}"))
            .containsExactly(ErrorCode.PRODUCT_NOT_FOUND, ErrorCode.PRODUCT_PART_NOT_FOUND);
        assertThat(ErrorResponseCodes.notFound("/api/products/{productId}/correction-requests"))
            .containsExactly(ErrorCode.PRODUCT_NOT_FOUND);
        assertThat(ErrorResponseCodes.notFound("/api/products")).isEmpty();
    }

    @Test
    @DisplayName("관리자 상세 조회는 자원별 없음 오류 코드를 문서화한다")
    void documentsAdminNotFoundErrors() {
        assertThat(ErrorResponseCodes.notFound("/api/admin/feedbacks/{feedbackId}"))
            .contains(ErrorCode.FEEDBACK_NOT_FOUND);
        assertThat(ErrorResponseCodes.notFound("/api/admin/product-requests/{requestId}"))
            .contains(ErrorCode.PRODUCT_REQUEST_NOT_FOUND);
    }
}
