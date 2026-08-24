package com.poudy.feedback.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.willThrow;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import com.poudy.exception.InfrastructureException;
import com.poudy.feedback.domain.Feedback;
import com.poudy.feedback.domain.FeedbackType;
import com.poudy.feedback.notification.FeedbackNotifier;
import com.poudy.feedback.repository.S3FeedbackRepository;
import java.time.Clock;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;

@ExtendWith(OutputCaptureExtension.class)
@DisplayName("의견 서비스")
class FeedbackServiceTest {

    private static final Clock CLOCK = Clock.fixed(
            Instant.parse("2026-08-23T07:20:30Z"),
            ZoneId.of("Asia/Seoul"));

    private final S3FeedbackRepository feedbackRepository = mock(S3FeedbackRepository.class);
    private final FeedbackNotifier feedbackNotifier = mock(FeedbackNotifier.class);
    private final FeedbackRateLimiter rateLimiter = mock(FeedbackRateLimiter.class);
    private final FeedbackService feedbackService = new FeedbackService(
            feedbackRepository,
            feedbackNotifier,
            rateLimiter,
            CLOCK);

    @Test
    @DisplayName("원본을 저장한 뒤 같은 의견으로 Discord 알림을 전송한다")
    void storesBeforeNotifying() {
        feedbackService.submit(
                FeedbackType.DATA_CORRECTION,
                "제품 정보가 실제 패키지와 달라요.",
                "/products/12345",
                "client-a");

        ArgumentCaptor<Feedback> feedbackCaptor = ArgumentCaptor.forClass(Feedback.class);
        InOrder order = inOrder(rateLimiter, feedbackRepository, feedbackNotifier);
        order.verify(rateLimiter).requireAllowed("client-a");
        order.verify(feedbackRepository).save(feedbackCaptor.capture());
        order.verify(feedbackNotifier).notify(feedbackCaptor.getValue());
        assertThat(feedbackCaptor.getValue().receivedAt())
                .isEqualTo(OffsetDateTime.parse("2026-08-23T16:20:30+09:00"));
    }

    @Test
    @DisplayName("S3 저장이 실패하면 Discord 알림을 전송하지 않는다")
    void skipsNotificationWhenStorageFails() {
        willThrow(new InfrastructureException("S3 실패")).given(feedbackRepository).save(any());

        assertThatThrownBy(
                () -> feedbackService.submit(
                        FeedbackType.BUG_REPORT,
                        "기능 버튼을 눌러도 화면이 바뀌지 않아요.",
                        "/products",
                        "client-a"))
                .isInstanceOf(InfrastructureException.class);
        verify(feedbackNotifier, never()).notify(any());
    }

    @Test
    @DisplayName("Discord 알림이 실패해도 접수 ID만 기록하고 성공 처리한다")
    void keepsSubmissionSuccessfulWhenNotificationFails(CapturedOutput output) {
        String content = "로그에 남으면 안 되는 사용자 의견 원문입니다.";
        willThrow(new RuntimeException("webhook secret"))
                .given(feedbackNotifier)
                .notify(any());

        assertThatCode(() -> feedbackService.submit(FeedbackType.OTHER, content, "/", "client-a"))
                .doesNotThrowAnyException();

        ArgumentCaptor<Feedback> feedbackCaptor = ArgumentCaptor.forClass(Feedback.class);
        verify(feedbackRepository).save(feedbackCaptor.capture());
        assertThat(output).contains(feedbackCaptor.getValue().id().toString());
        assertThat(output).doesNotContain(content).doesNotContain("webhook secret");
    }
}
