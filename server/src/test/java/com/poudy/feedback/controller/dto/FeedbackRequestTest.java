package com.poudy.feedback.controller.dto;

import static org.assertj.core.api.Assertions.assertThat;

import com.poudy.feedback.domain.FeedbackType;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

@DisplayName("의견과 제품 정보 정정 요청 본문")
class FeedbackRequestTest {

    private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();

    @ParameterizedTest
    @ValueSource(ints = {10, 2000})
    @DisplayName("앞뒤 공백을 제거한 내용으로 최소·최대 길이를 검증한다")
    void acceptsTrimmedBoundaryLengths(int length) {
        String content = "가".repeat(length);
        FeedbackRequest feedback = new FeedbackRequest(FeedbackType.OTHER, "  " + content + "  ", null, null);
        ProductCorrectionRequest correction = new ProductCorrectionRequest("  " + content + "  ", null);

        assertThat(feedback.content()).isEqualTo(content);
        assertThat(correction.content()).isEqualTo(content);
        assertThat(validator.validate(feedback)).isEmpty();
        assertThat(validator.validate(correction)).isEmpty();
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"   ", "  가 나 다 라 마  "})
    @DisplayName("앞뒤 공백을 제거한 내용이 없거나 10자보다 짧으면 거절한다")
    void rejectsShortContent(String content) {
        assertThat(validator.validate(new FeedbackRequest(FeedbackType.OTHER, content, null, null))).isNotEmpty();
        assertThat(validator.validate(new ProductCorrectionRequest(content, null))).isNotEmpty();
    }

    @Test
    @DisplayName("앞뒤 공백을 제거한 내용이 2,000자를 넘으면 거절한다")
    void rejectsTooLongContent() {
        String content = "  " + "가".repeat(2001) + "  ";

        assertThat(validator.validate(new FeedbackRequest(FeedbackType.OTHER, content, null, null))).isNotEmpty();
        assertThat(validator.validate(new ProductCorrectionRequest(content, null))).isNotEmpty();
    }
}
