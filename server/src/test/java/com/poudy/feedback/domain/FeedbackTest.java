package com.poudy.feedback.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Clock;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;
import java.util.stream.IntStream;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("의견")
class FeedbackTest {

    private static final Clock CLOCK = Clock.fixed(
        Instant.parse("2026-08-23T07:20:30Z"),
        ZoneId.of("Asia/Seoul")
    );
    private static final ServiceFeedback OTHER = new ServiceFeedback(FeedbackType.OTHER, FeedbackPath.from("/"));

    @Test
    @DisplayName("접수 ID와 접수 시각을 생성한다")
    void registersFeedback() {
        ServiceFeedback subject = new ServiceFeedback(FeedbackType.BUG_REPORT, FeedbackPath.from("/products/12345"));

        Feedback feedback = Feedback.register(subject, "  검색 버튼을 눌러도 반응이 없어요.  ", CLOCK);

        assertThat(feedback.id()).isNotNull();
        assertThat(feedback.subject()).isEqualTo(subject);
        assertThat(feedback.content().value()).isEqualTo("  검색 버튼을 눌러도 반응이 없어요.  ");
        assertThat(feedback.receivedAt()).isEqualTo(OffsetDateTime.parse("2026-08-23T16:20:30+09:00"));
        assertThat(feedback.status()).isEqualTo(FeedbackStatus.RECEIVED);
        assertThat(feedback.statusChangedAt()).isEqualTo(feedback.receivedAt());
        assertThat(feedback.completedAt()).isNull();
    }

    @Test
    @DisplayName("제품 정보 정정 요청은 대상 제품을 가진다")
    void registersProductCorrection() {
        Feedback feedback = Feedback.register(
            new ProductCorrection(1L, "블랙 스네일 토너"),
            "전성분 표기가 실제 패키지와 달라요.",
            CLOCK
        );

        assertThat(feedback.subject()).isEqualTo(new ProductCorrection(1L, "블랙 스네일 토너"));
    }

    @Test
    @DisplayName("상태가 실제로 바뀔 때만 처리 시각을 갱신한다")
    void transitionsStatusIdempotently() {
        Feedback received = Feedback.register(OTHER, "충분히 긴 기타 의견입니다.", CLOCK);
        Clock completedClock = Clock.fixed(Instant.parse("2026-08-24T00:00:00Z"), ZoneId.of("Asia/Seoul"));
        Clock reopenedClock = Clock.fixed(Instant.parse("2026-08-25T00:00:00Z"), ZoneId.of("Asia/Seoul"));

        Feedback completed = received.changeStatus(FeedbackStatus.COMPLETED, completedClock);
        Feedback repeated = completed.changeStatus(FeedbackStatus.COMPLETED, CLOCK);
        Feedback reopened = completed.changeStatus(FeedbackStatus.IN_PROGRESS, reopenedClock);

        assertThat(completed.status()).isEqualTo(FeedbackStatus.COMPLETED);
        assertThat(completed.completedAt()).isEqualTo(OffsetDateTime.parse("2026-08-24T09:00:00+09:00"));
        assertThat(repeated).isSameAs(completed);
        assertThat(reopened.completedAt()).isNull();
        assertThat(reopened.statusChangedAt()).isEqualTo(OffsetDateTime.parse("2026-08-25T09:00:00+09:00"));
    }

    @Test
    @DisplayName("지정한 상태와 유형에 일치하고 생략한 조건은 무시한다")
    void matchesStatusAndType() {
        Feedback feedback = Feedback.register(
            new ProductCorrection(1L, "블랙 스네일 토너"),
            "제품 정보가 실제 패키지와 달라요.",
            CLOCK
        );

        assertThat(feedback.matches(FeedbackStatus.RECEIVED, FeedbackSubjectType.PRODUCT_CORRECTION)).isTrue();
        assertThat(feedback.matches(null, FeedbackSubjectType.PRODUCT_CORRECTION)).isTrue();
        assertThat(feedback.matches(FeedbackStatus.RECEIVED, null)).isTrue();
        assertThat(feedback.matches(null, null)).isTrue();
        assertThat(feedback.matches(FeedbackStatus.COMPLETED, FeedbackSubjectType.PRODUCT_CORRECTION)).isFalse();
        assertThat(feedback.matches(FeedbackStatus.RECEIVED, FeedbackSubjectType.BUG_REPORT)).isFalse();
    }

    @Test
    @DisplayName("공백을 제외하고 10자보다 짧은 의견을 거절한다")
    void rejectsShortContentAfterStripping() {
        assertThatThrownBy(() -> Feedback.register(OTHER, "짧 은 의 견 입 니 다", CLOCK))
            .isInstanceOf(InvalidFeedbackException.class);
    }

    @Test
    @DisplayName("2,000자보다 긴 의견을 거절한다")
    void rejectsTooLongContent() {
        assertThatThrownBy(() -> Feedback.register(OTHER, "가".repeat(2001), CLOCK))
            .isInstanceOf(InvalidFeedbackException.class);
    }

    @Test
    @DisplayName("비어 있거나 500자보다 긴 화면 경로를 거절한다")
    void rejectsInvalidPath() {
        assertThatThrownBy(() -> FeedbackPath.from(" ")).isInstanceOf(InvalidFeedbackException.class);
        assertThatThrownBy(() -> FeedbackPath.from("/" + "a".repeat(500)))
            .isInstanceOf(InvalidFeedbackException.class);
    }

    @Test
    @DisplayName("전달되지 않은 화면 경로는 알 수 없는 경로로 둔다")
    void keepsMissingPathUnknown() {
        assertThat(FeedbackPath.from(null).value()).isEmpty();
        assertThat(FeedbackPath.from(null)).isEqualTo(FeedbackPath.from(null));
        assertThat(FeedbackPath.from("/").value()).contains("/");
    }

    @Test
    @DisplayName("첨부 이미지 ID의 개수와 중복 규칙을 의견이 검증한다")
    void validatesImageIds() {
        UUID imageId = UUID.randomUUID();

        assertThatThrownBy(() -> Feedback.normalizeImageIds(List.of(imageId, imageId)))
            .isInstanceOf(InvalidFeedbackImageIdException.class);
        assertThatThrownBy(
            () -> Feedback.normalizeImageIds(
                IntStream.range(0, Feedback.MAX_IMAGE_COUNT + 1)
                    .mapToObj(ignored -> UUID.randomUUID())
                    .toList()
            )
        )
            .isInstanceOf(InvalidFeedbackImageIdException.class);
        assertThat(Feedback.normalizeImageIds(null)).isEmpty();
    }
}
