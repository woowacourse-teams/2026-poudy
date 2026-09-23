package com.poudy.feedback.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import com.poudy.exception.InfrastructureException;
import com.poudy.feedback.repository.FeedbackRepository;
import com.poudy.feedback.repository.S3FeedbackImageRepository;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;

@DisplayName("의견 보유기간 정리")
class FeedbackRetentionServiceTest {

    private static final Clock CLOCK = Clock.fixed(Instant.parse("2026-09-19T03:30:00Z"), ZoneOffset.UTC);

    private final FeedbackRepository feedbackRepository = mock(FeedbackRepository.class);
    private final S3FeedbackImageRepository imageRepository = mock(S3FeedbackImageRepository.class);

    @Test
    @DisplayName("83일 경계까지의 의견은 S3 데이터를 지운 뒤 DB 행을 지운다")
    void deletesS3DataBeforeDatabaseRow() {
        UUID feedbackId = UUID.randomUUID();
        given(feedbackRepository.findExpiredIds(any(), anyInt())).willReturn(List.of(feedbackId));
        given(feedbackRepository.deleteExpired(any(), any())).willReturn(true);
        FeedbackRetentionService service = service();

        service.purgeExpired();

        ArgumentCaptor<OffsetDateTime> cutoff = ArgumentCaptor.forClass(OffsetDateTime.class);
        verify(feedbackRepository).findExpiredIds(cutoff.capture(), anyInt());
        assertThat(cutoff.getValue()).isEqualTo(OffsetDateTime.parse("2026-06-28T03:30:00Z"));
        InOrder order = inOrder(imageRepository, feedbackRepository);
        order.verify(imageRepository).deleteRetainedData(feedbackId);
        order.verify(feedbackRepository).deleteExpired(feedbackId, cutoff.getValue());
    }

    @Test
    @DisplayName("S3 삭제가 실패하면 DB 행을 남겨 다음 주기에 재시도한다")
    void keepsDatabaseRowWhenS3DeletionFails() {
        UUID feedbackId = UUID.randomUUID();
        given(feedbackRepository.findExpiredIds(any(), anyInt())).willReturn(List.of(feedbackId));
        org.mockito.BDDMockito.willThrow(new InfrastructureException("S3 장애"))
            .given(imageRepository).deleteRetainedData(feedbackId);

        service().purgeExpired();

        verify(feedbackRepository, never()).deleteExpired(any(), any());
    }

    private FeedbackRetentionService service() {
        return new FeedbackRetentionService(
            feedbackRepository,
            imageRepository,
            CLOCK,
            Duration.ofDays(83),
            500,
            20
        );
    }
}
