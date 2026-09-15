package com.poudy.config;

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
}
