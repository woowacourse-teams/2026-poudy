package com.poudy.openapi;

import static org.assertj.core.api.Assertions.assertThat;

import com.poudy.exception.ErrorCode;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("OpenAPI 오류 응답 코드 설정")
class ErrorResponseCodesTest {

    @Test
    @DisplayName("관리자 로그인 잘못된 요청은 본문 오류 코드만 문서화한다")
    void documentsInvalidRequestBodyForAdminLogin() {
        assertThat(ErrorResponseCodes.badRequest("/api/admin/login"))
            .containsExactly(ErrorCode.INVALID_REQUEST_BODY);
    }

    @Test
    @DisplayName("관리자 요청은 쿼리와 본문 오류 코드를 문서화한다")
    void documentsAdminRequestErrors() {
        assertThat(ErrorResponseCodes.badRequest("/api/admin/feedbacks/{feedbackId}/status"))
            .containsExactly(ErrorCode.INVALID_QUERY_PARAMETER, ErrorCode.INVALID_REQUEST_BODY);
        assertThat(ErrorResponseCodes.badRequest("/api/admin/product-requests"))
            .containsExactly(ErrorCode.INVALID_QUERY_PARAMETER, ErrorCode.INVALID_REQUEST_BODY);
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
