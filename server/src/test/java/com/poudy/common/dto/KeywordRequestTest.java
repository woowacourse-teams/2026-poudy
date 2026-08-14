package com.poudy.common.dto;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.poudy.exception.InvalidRequestException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("검색어 요청")
class KeywordRequestTest {

    @Test
    @DisplayName("검색어가 비어 있으면 잘못된 요청으로 거절한다")
    void rejectsBlankKeyword() {
        assertThatThrownBy(() -> new KeywordRequest("   ").validate()).isInstanceOf(InvalidRequestException.class);
        assertThatThrownBy(() -> new KeywordRequest("").validate()).isInstanceOf(InvalidRequestException.class);
        assertThatThrownBy(() -> new KeywordRequest(null).validate()).isInstanceOf(InvalidRequestException.class);
    }

    @Test
    @DisplayName("생성 자체는 실패하지 않는다")
    void neverFailsWhileBinding() {
        assertThatCode(() -> new KeywordRequest(null)).doesNotThrowAnyException();
        assertThatCode(() -> new KeywordRequest("")).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("검색어가 있으면 통과한다")
    void acceptsKeyword() {
        assertThatCode(() -> new KeywordRequest("글리").validate()).doesNotThrowAnyException();
    }
}
