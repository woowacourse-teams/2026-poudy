package com.poudy.exception;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("오류 코드")
class ErrorCodeTest {

    @Test
    @DisplayName("이름으로 코드를 찾는다")
    void findsByName() {
        assertThat(ErrorCode.from("CONFLICTING_INGREDIENT_FILTER")).contains(ErrorCode.CONFLICTING_INGREDIENT_FILTER);
    }

    @Test
    @DisplayName("코드 이름이 아니면 비어 있다")
    void returnsEmptyForUnknownName() {
        assertThat(ErrorCode.from("같은 성분을 포함과 제외에 함께 쓸 수 없습니다.")).isEmpty();
    }

    @Test
    @DisplayName("문구가 없는 위반도 비어 있는 결과로 받는다")
    void returnsEmptyForMissingName() {
        assertThat(ErrorCode.from(null)).isEmpty();
    }
}
