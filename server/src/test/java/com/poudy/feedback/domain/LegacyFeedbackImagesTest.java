package com.poudy.feedback.domain;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("이전 경로 의견 이미지 목록")
class LegacyFeedbackImagesTest {

    @Test
    @DisplayName("이 DB의 같은 의견에 붙은 이미지와 붙은 이전 임시 이미지는 옮기고, 붙지 않은 이전 임시 이미지만 지운다")
    void classifiesByOwners() {
        UUID feedbackId = UUID.randomUUID();
        LegacyFeedbackImage stored = LegacyFeedbackImage.stored("stored", UUID.randomUUID(), feedbackId);
        LegacyFeedbackImage attachedPending = LegacyFeedbackImage.pending("attached-pending", UUID.randomUUID());
        LegacyFeedbackImage unusedPending = LegacyFeedbackImage.pending("unused-pending", UUID.randomUUID());
        LegacyFeedbackImage otherEnvironment = LegacyFeedbackImage
            .stored("other", UUID.randomUUID(), UUID.randomUUID());
        LegacyFeedbackImage otherOwner = LegacyFeedbackImage
            .stored("other-owner", UUID.randomUUID(), UUID.randomUUID());
        LegacyFeedbackImages images = new LegacyFeedbackImages(
            List.of(stored, attachedPending, unusedPending, otherEnvironment, otherOwner)
        );

        LegacyImageMigration migration = images.classify(
            Map.of(
                stored.imageId(),
                feedbackId,
                attachedPending.imageId(),
                feedbackId,
                otherOwner.imageId(),
                feedbackId
            )
        );

        assertThat(migration.toMove()).extracting(LegacyFeedbackImage::key)
            .containsExactly("stored", "attached-pending");
        assertThat(migration.toDiscard()).extracting(LegacyFeedbackImage::key).containsExactly("unused-pending");
        assertThat(images.imageIds()).containsExactly(
            stored.imageId(),
            attachedPending.imageId(),
            unusedPending.imageId(),
            otherEnvironment.imageId(),
            otherOwner.imageId()
        );
    }

    @Test
    @DisplayName("옮기거나 지우기로 한 이미지 가운데 처리하지 못한 수를 센다")
    void countsFailures() {
        LegacyImageMigration migration = new LegacyImageMigration(
            List.of(
                LegacyFeedbackImage.pending("a", UUID.randomUUID()),
                LegacyFeedbackImage.pending("b", UUID.randomUUID())
            ),
            List.of(LegacyFeedbackImage.pending("c", UUID.randomUUID()))
        );

        assertThat(migration.failedAmong(1, 1)).isOne();
        assertThat(migration.failedAmong(2, 1)).isZero();
    }
}
