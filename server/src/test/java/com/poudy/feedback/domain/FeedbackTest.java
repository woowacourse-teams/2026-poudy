package com.poudy.feedback.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Clock;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("의견")
class FeedbackTest {

    private static final Clock CLOCK = Clock.fixed(
            Instant.parse("2026-08-23T07:20:30Z"),
            ZoneId.of("Asia/Seoul"));

    @Test
    @DisplayName("접수 ID와 접수 시각을 생성한다")
    void registersFeedback() {
        Feedback feedback = Feedback.register(
                FeedbackType.DATA_CORRECTION,
                "  제품 정보가 실제 패키지와 달라요.  ",
                "/products/12345",
                CLOCK);

        assertThat(feedback.id()).isNotNull();
        assertThat(feedback.type()).isEqualTo(FeedbackType.DATA_CORRECTION);
        assertThat(feedback.content().value()).isEqualTo("  제품 정보가 실제 패키지와 달라요.  ");
        assertThat(feedback.path().value()).isEqualTo("/products/12345");
        assertThat(feedback.receivedAt()).isEqualTo(OffsetDateTime.parse("2026-08-23T16:20:30+09:00"));
    }

    @Test
    @DisplayName("공백을 제외하고 10자보다 짧은 의견을 거절한다")
    void rejectsShortContentAfterStripping() {
        assertThatThrownBy(() -> Feedback.register(FeedbackType.OTHER, "짧 은 의 견 입 니 다", "/", CLOCK))
                .isInstanceOf(InvalidFeedbackException.class);
    }

    @Test
    @DisplayName("2,000자보다 긴 의견을 거절한다")
    void rejectsTooLongContent() {
        assertThatThrownBy(() -> Feedback.register(FeedbackType.OTHER, "가".repeat(2001), "/", CLOCK))
                .isInstanceOf(InvalidFeedbackException.class);
    }

    @Test
    @DisplayName("비어 있거나 500자보다 긴 화면 경로를 거절한다")
    void rejectsInvalidPath() {
        assertThatThrownBy(() -> Feedback.register(FeedbackType.OTHER, "충분히 긴 기타 의견입니다.", " ", CLOCK))
                .isInstanceOf(InvalidFeedbackException.class);
        assertThatThrownBy(
                () -> Feedback.register(
                        FeedbackType.OTHER,
                        "충분히 긴 기타 의견입니다.",
                        "/" + "a".repeat(500),
                        CLOCK))
                .isInstanceOf(InvalidFeedbackException.class);
    }

    @Test
    @DisplayName("첨부 이미지 ID의 개수와 중복 규칙을 의견이 검증한다")
    void validatesImageIds() {
        UUID imageId = UUID.randomUUID();

        assertThatThrownBy(() -> Feedback.normalizeImageIds(List.of(imageId, imageId)))
                .isInstanceOf(InvalidFeedbackImageIdException.class);
        assertThatThrownBy(
                () -> Feedback.normalizeImageIds(
                        java.util.stream.IntStream.range(0, Feedback.MAX_IMAGE_COUNT + 1)
                                .mapToObj(ignored -> UUID.randomUUID())
                                .toList()))
                .isInstanceOf(InvalidFeedbackImageIdException.class);
        assertThat(Feedback.normalizeImageIds(null)).isEmpty();
    }
}
