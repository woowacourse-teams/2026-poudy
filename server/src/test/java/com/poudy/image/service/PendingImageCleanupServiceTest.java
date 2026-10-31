package com.poudy.image.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.willThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import com.poudy.exception.InfrastructureException;
import com.poudy.image.domain.ImagePurpose;
import com.poudy.image.domain.PendingImage;
import com.poudy.image.repository.PendingImageRepository;
import com.poudy.image.repository.S3ImageRepository;
import com.poudy.image.service.PendingImageCleanupService.CleanupCounts;
import java.io.IOException;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.env.YamlPropertySourceLoader;
import org.springframework.core.env.PropertySource;
import org.springframework.core.io.ClassPathResource;
import org.springframework.scheduling.annotation.Scheduled;

@DisplayName("만료 임시 이미지 정리")
class PendingImageCleanupServiceTest {

    private static final Instant NOW = Instant.parse("2026-10-31T00:00:00Z");

    private final PendingImageRepository pendingRepository = mock(PendingImageRepository.class);
    private final S3ImageRepository imageRepository = mock(S3ImageRepository.class);
    private final Clock clock = Clock.fixed(NOW, ZoneOffset.UTC);
    private final PendingImageCleanupService service = new PendingImageCleanupService(
        pendingRepository,
        imageRepository,
        clock,
        true,
        500
    );

    @Test
    @DisplayName("만료된 임시 이미지의 파일을 지운 뒤 행을 지우고, 한 장이 실패해도 나머지를 계속 지운다")
    void deletesExpiredImages() {
        PendingImage failing = pending();
        PendingImage succeeding = pending();
        given(pendingRepository.findExpired(NOW, 500)).willReturn(List.of(failing, succeeding));
        willThrow(new InfrastructureException("S3 실패")).given(imageRepository)
            .delete(failing.id(), ImagePurpose.FEEDBACK);

        CleanupCounts counts = service.cleanup(NOW);

        assertThat(counts).isEqualTo(new CleanupCounts(1, 1));
        verify(pendingRepository, never()).delete(failing.id());
        verify(imageRepository).delete(succeeding.id(), ImagePurpose.FEEDBACK);
        verify(pendingRepository).delete(succeeding.id());
    }

    @Test
    @DisplayName("주기 처리는 최초 1분 후 시작해 5분 간격으로 실행한다")
    void schedulesEveryFiveMinutes() throws NoSuchMethodException, IOException {
        Scheduled scheduled = PendingImageCleanupService.class.getMethod("cleanupScheduled")
            .getAnnotation(Scheduled.class);

        assertThat(scheduled.fixedDelayString()).isEqualTo("${poudy.image.pending-cleanup.interval:PT5M}");
        assertThat(scheduled.initialDelayString()).isEqualTo("${poudy.image.pending-cleanup.initial-delay:PT1M}");
        assertThat(loadProperties("application.yml").getProperty("poudy.image.pending-cleanup.interval"))
            .isEqualTo("PT5M");
    }

    @Test
    @DisplayName("주기 처리는 기본 설정에서 꺼져 있고 운영 설정에서 켜진다")
    void enablesScheduleOnlyForProduction() throws IOException {
        assertThat(loadProperties("application.yml").getProperty("poudy.image.pending-cleanup.enabled"))
            .isEqualTo(false);
        assertThat(loadProperties("application-prod.yml").getProperty("poudy.image.pending-cleanup.enabled"))
            .isEqualTo(true);
    }

    @Test
    @DisplayName("주기 처리가 꺼져 있으면 저장소를 읽지 않는다")
    void skipsScheduledRunWhenDisabled() {
        PendingImageCleanupService disabled = new PendingImageCleanupService(
            pendingRepository,
            imageRepository,
            clock,
            false,
            500
        );

        disabled.cleanupScheduled();

        verify(pendingRepository, never()).findExpired(NOW, 500);
    }

    @Test
    @DisplayName("주기 처리가 켜져 있으면 현재 시각으로 정리하고 실패해도 예외를 던지지 않는다")
    void runsScheduledCleanupWhenEnabled() {
        given(pendingRepository.findExpired(NOW, 500)).willThrow(new InfrastructureException("DB 실패"));

        service.cleanupScheduled();

        verify(pendingRepository).findExpired(NOW, 500);
    }

    @Test
    @DisplayName("배치 크기는 1 이상이어야 한다")
    void rejectsNonPositiveBatchSize() {
        assertThatThrownBy(() -> new PendingImageCleanupService(pendingRepository, imageRepository, clock, true, 0))
            .isInstanceOf(IllegalArgumentException.class);
    }

    private static PropertySource<?> loadProperties(String resource) throws IOException {
        return new YamlPropertySourceLoader().load(resource, new ClassPathResource(resource)).getFirst();
    }

    private static PendingImage pending() {
        return new PendingImage(UUID.randomUUID(), ImagePurpose.FEEDBACK);
    }
}
