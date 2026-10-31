package com.poudy.feedback.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.willThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import com.poudy.exception.InfrastructureException;
import com.poudy.feedback.domain.LegacyFeedbackImage;
import com.poudy.feedback.domain.LegacyFeedbackImages;
import com.poudy.feedback.repository.FeedbackRepository;
import com.poudy.feedback.repository.LegacyFeedbackImageRepository;
import com.poudy.feedback.service.FeedbackImageMigrationService.MigrationCounts;
import com.poudy.image.domain.ImagePurpose;
import com.poudy.image.repository.S3ImageRepository;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("이전 의견 이미지 옮기기")
class FeedbackImageMigrationServiceTest {

    private final LegacyFeedbackImageRepository legacyRepository = mock(LegacyFeedbackImageRepository.class);
    private final FeedbackRepository feedbackRepository = mock(FeedbackRepository.class);
    private final S3ImageRepository imageRepository = mock(S3ImageRepository.class);
    private final FeedbackImageMigrationService service = new FeedbackImageMigrationService(
        legacyRepository,
        feedbackRepository,
        imageRepository,
        true
    );

    @Test
    @DisplayName("옮길 이미지는 새 경로로 복사한 뒤 원본을 지우고, 지울 이미지는 바로 지운다")
    void movesAndDiscards() {
        UUID feedbackId = UUID.randomUUID();
        LegacyFeedbackImage stored = LegacyFeedbackImage.stored("stored-key", UUID.randomUUID(), feedbackId);
        LegacyFeedbackImage unused = LegacyFeedbackImage.pending("unused-key", UUID.randomUUID());
        given(legacyRepository.findAll()).willReturn(new LegacyFeedbackImages(List.of(stored, unused)));
        given(feedbackRepository.feedbackIdsByImage(any())).willReturn(Map.of(stored.imageId(), feedbackId));

        MigrationCounts counts = service.migrate();

        assertThat(counts).isEqualTo(new MigrationCounts(1, 1, 0));
        verify(imageRepository).copyFrom("stored-key", stored.imageId(), ImagePurpose.FEEDBACK);
        verify(legacyRepository).delete("stored-key");
        verify(legacyRepository).delete("unused-key");
    }

    @Test
    @DisplayName("복사에 실패하면 이전 파일을 남겨 다음 주기에 다시 시도한다")
    void keepsLegacyFileWhenCopyFails() {
        UUID feedbackId = UUID.randomUUID();
        LegacyFeedbackImage stored = LegacyFeedbackImage.stored("stored-key", UUID.randomUUID(), feedbackId);
        given(legacyRepository.findAll()).willReturn(new LegacyFeedbackImages(List.of(stored)));
        given(feedbackRepository.feedbackIdsByImage(any())).willReturn(Map.of(stored.imageId(), feedbackId));
        willThrow(new InfrastructureException("S3 실패")).given(imageRepository)
            .copyFrom("stored-key", stored.imageId(), ImagePurpose.FEEDBACK);

        MigrationCounts counts = service.migrate();

        assertThat(counts).isEqualTo(new MigrationCounts(0, 0, 1));
        verify(legacyRepository, never()).delete("stored-key");
    }

    @Test
    @DisplayName("주기 처리가 꺼져 있으면 S3를 읽지 않는다")
    void skipsWhenDisabled() {
        new FeedbackImageMigrationService(legacyRepository, feedbackRepository, imageRepository, false)
            .migrateScheduled();

        verify(legacyRepository, never()).findAll();
    }
}
