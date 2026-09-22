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
import com.poudy.feedback.domain.FeedbackPath;
import com.poudy.feedback.domain.FeedbackType;
import com.poudy.feedback.domain.ServiceFeedback;
import com.poudy.feedback.domain.image.FeedbackImage;
import com.poudy.feedback.domain.image.FeedbackImageFormat;
import com.poudy.feedback.domain.image.PendingImage;
import com.poudy.feedback.repository.FeedbackRepository;
import com.poudy.feedback.repository.S3FeedbackImageRepository;
import com.poudy.feedback.service.FeedbackImageTransferService.TransferCounts;
import java.io.IOException;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.env.YamlPropertySourceLoader;
import org.springframework.core.env.PropertySource;
import org.springframework.core.io.ClassPathResource;
import org.springframework.scheduling.annotation.Scheduled;

@DisplayName("의견 이미지 옮기기")
class FeedbackImageTransferServiceTest {

    private static final Instant NOW = Instant.parse("2026-09-19T00:00:00Z");

    private final FeedbackRepository feedbackRepository = mock(FeedbackRepository.class);
    private final S3FeedbackImageRepository imageRepository = mock(S3FeedbackImageRepository.class);
    private final Clock clock = Clock.fixed(NOW, ZoneOffset.UTC);
    private final FeedbackImageTransferService service = new FeedbackImageTransferService(
        feedbackRepository,
        imageRepository,
        clock,
        true
    );

    @Test
    @DisplayName("저장된 의견의 이미지를 모두 옮기고 한 장이 실패해도 나머지를 계속 옮긴다")
    void transfersEveryImageOfSavedFeedback() {
        FeedbackImage failing = image();
        FeedbackImage succeeding = image();
        Feedback feedback = new ServiceFeedback(
            UUID.randomUUID(),
            FeedbackType.OTHER,
            FeedbackPath.from(null),
            new FeedbackContent("이미지를 붙인 의견입니다"),
            OffsetDateTime.parse("2026-09-19T09:00:00+09:00"),
            List.of(failing, succeeding)
        );
        given(imageRepository.transfer(feedback.id(), failing)).willThrow(new InfrastructureException("S3 실패"));
        given(imageRepository.transfer(feedback.id(), succeeding)).willReturn(true);

        service.transfer(feedback);

        verify(imageRepository).transfer(feedback.id(), succeeding);
    }

    @Test
    @DisplayName("주기 처리는 의견에 쓰인 pending 을 옮기고, 쓰이지 않은 pending 은 유예가 지난 것만 지운다")
    void transfersOwnedPendingAndCleansExpiredOrphans() {
        UUID feedbackId = UUID.randomUUID();
        PendingImage owned = pending(NOW.minusSeconds(60));
        PendingImage freshOrphan = pending(NOW.minusSeconds(60));
        PendingImage expiredOrphan = pending(NOW.minus(Duration.ofDays(2)));
        given(imageRepository.findAllPending()).willReturn(List.of(owned, freshOrphan, expiredOrphan));
        given(feedbackRepository.feedbackIdsByImage(any())).willReturn(Map.of(owned.image().id(), feedbackId));
        given(imageRepository.transfer(feedbackId, owned.image())).willReturn(true);

        TransferCounts counts = service.transferPending(NOW);

        assertThat(counts).isEqualTo(new TransferCounts(1, 0, 1));
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

        TransferCounts counts = service.transferPending(NOW);

        assertThat(counts).isEqualTo(new TransferCounts(0, 1, 0));
        verify(imageRepository, never()).deletePending(any());
    }

    @Test
    @DisplayName("주기 처리는 최초 1분 후 시작해 5분 간격으로 실행한다")
    void schedulesEveryFiveMinutes() throws NoSuchMethodException, IOException {
        Scheduled scheduled = FeedbackImageTransferService.class.getMethod("transferPendingImages")
            .getAnnotation(Scheduled.class);

        assertThat(scheduled.fixedDelayString())
            .isEqualTo("${poudy.feedback.image-transfer.interval:PT5M}");
        assertThat(scheduled.initialDelayString())
            .isEqualTo("${poudy.feedback.image-transfer.initial-delay:PT1M}");
        assertThat(loadProperties("application.yml").getProperty("poudy.feedback.image-transfer.interval"))
            .isEqualTo("PT5M");
    }

    @Test
    @DisplayName("주기 처리는 기본 설정에서 꺼져 있고 운영 설정에서 켜진다")
    void enablesScheduleOnlyForProduction() throws IOException {
        assertThat(loadProperties("application.yml").getProperty("poudy.feedback.image-transfer.enabled"))
            .isEqualTo(false);
        assertThat(loadProperties("application-prod.yml").getProperty("poudy.feedback.image-transfer.enabled"))
            .isEqualTo(true);
    }

    @Test
    @DisplayName("주기 처리가 꺼져 있으면 저장소를 읽지 않는다")
    void skipsScheduledRunWhenDisabled() {
        FeedbackImageTransferService disabled = new FeedbackImageTransferService(
            feedbackRepository,
            imageRepository,
            clock,
            false
        );

        disabled.transferPendingImages();

        verify(imageRepository, never()).findAllPending();
    }

    @Test
    @DisplayName("주기 처리가 켜져 있으면 현재 시각으로 pending 을 처리하고 실패해도 예외를 던지지 않는다")
    void runsScheduledTransferWhenEnabled() {
        given(imageRepository.findAllPending()).willThrow(new InfrastructureException("S3 실패"));

        service.transferPendingImages();

        verify(imageRepository).findAllPending();
    }

    private static PropertySource<?> loadProperties(String resource) throws IOException {
        return new YamlPropertySourceLoader().load(resource, new ClassPathResource(resource)).getFirst();
    }

    private static FeedbackImage image() {
        return new FeedbackImage(UUID.randomUUID(), FeedbackImageFormat.PNG);
    }

    private static PendingImage pending(Instant lastModified) {
        return new PendingImage(image(), "etag", lastModified);
    }
}
