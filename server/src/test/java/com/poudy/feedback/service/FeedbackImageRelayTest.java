package com.poudy.feedback.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import com.poudy.exception.InfrastructureException;
import com.poudy.feedback.domain.Feedback;
import com.poudy.feedback.domain.FeedbackContent;
import com.poudy.feedback.domain.FeedbackImage;
import com.poudy.feedback.domain.FeedbackImageFormat;
import com.poudy.feedback.domain.FeedbackPath;
import com.poudy.feedback.domain.FeedbackType;
import com.poudy.feedback.domain.ServiceFeedback;
import com.poudy.feedback.repository.FeedbackRepository;
import com.poudy.feedback.repository.S3FeedbackImageRepository;
import com.poudy.feedback.repository.S3FeedbackImageRepository.PendingImage;
import com.poudy.feedback.service.FeedbackImageRelay.RelayCounts;
import java.time.Duration;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("의견 이미지 옮기기")
class FeedbackImageRelayTest {

    private static final Instant NOW = Instant.parse("2026-09-19T00:00:00Z");

    private final FeedbackRepository feedbackRepository = mock(FeedbackRepository.class);
    private final S3FeedbackImageRepository imageRepository = mock(S3FeedbackImageRepository.class);
    private final FeedbackImageRelay relay = new FeedbackImageRelay(feedbackRepository, imageRepository);

    @Test
    @DisplayName("저장된 의견의 이미지를 모두 옮기고 한 장이 실패해도 나머지를 계속 옮긴다")
    void relaysEveryImageOfSavedFeedback() {
        FeedbackImage failing = image();
        FeedbackImage succeeding = image();
        Feedback feedback = new Feedback(
            UUID.randomUUID(),
            new ServiceFeedback(FeedbackType.OTHER, FeedbackPath.from(null)),
            new FeedbackContent("이미지를 붙인 의견입니다"),
            OffsetDateTime.parse("2026-09-19T09:00:00+09:00"),
            List.of(failing, succeeding)
        );
        given(imageRepository.transfer(feedback.id(), failing)).willThrow(new InfrastructureException("S3 실패"));
        given(imageRepository.transfer(feedback.id(), succeeding)).willReturn(true);

        relay.relay(feedback);

        verify(imageRepository).transfer(feedback.id(), succeeding);
    }

    @Test
    @DisplayName("주기 처리는 의견에 쓰인 pending 을 옮기고, 쓰이지 않은 pending 은 유예가 지난 것만 지운다")
    void relaysOwnedPendingAndCleansExpiredOrphans() {
        UUID feedbackId = UUID.randomUUID();
        PendingImage owned = pending(NOW.minusSeconds(60));
        PendingImage freshOrphan = pending(NOW.minusSeconds(60));
        PendingImage expiredOrphan = pending(NOW.minus(Duration.ofDays(2)));
        given(imageRepository.findAllPending()).willReturn(List.of(owned, freshOrphan, expiredOrphan));
        given(feedbackRepository.feedbackIdsByImage(any())).willReturn(Map.of(owned.image().id(), feedbackId));
        given(imageRepository.transfer(feedbackId, owned.image())).willReturn(true);

        RelayCounts counts = relay.relayPending(NOW);

        assertThat(counts).isEqualTo(new RelayCounts(1, 0, 1));
        verify(imageRepository).transfer(feedbackId, owned.image());
        verify(imageRepository).deletePending(expiredOrphan.image());
        verify(imageRepository, never()).deletePending(freshOrphan.image());
        verify(imageRepository, never()).deletePending(owned.image());
    }

    @Test
    @DisplayName("옮기지 못한 이미지는 실패로 세고 다음 주기에 다시 시도하도록 pending 을 남긴다")
    void countsFailedTransfers() {
        UUID feedbackId = UUID.randomUUID();
        PendingImage owned = pending(NOW.minus(Duration.ofDays(2)));
        given(imageRepository.findAllPending()).willReturn(List.of(owned));
        given(feedbackRepository.feedbackIdsByImage(any())).willReturn(Map.of(owned.image().id(), feedbackId));
        given(imageRepository.transfer(feedbackId, owned.image())).willThrow(new InfrastructureException("S3 실패"));

        RelayCounts counts = relay.relayPending(NOW);

        assertThat(counts).isEqualTo(new RelayCounts(0, 1, 0));
        verify(imageRepository, never()).deletePending(any());
    }

    private static FeedbackImage image() {
        return new FeedbackImage(UUID.randomUUID(), FeedbackImageFormat.PNG);
    }

    private static PendingImage pending(Instant lastModified) {
        return new PendingImage(image(), "etag", lastModified);
    }
}
