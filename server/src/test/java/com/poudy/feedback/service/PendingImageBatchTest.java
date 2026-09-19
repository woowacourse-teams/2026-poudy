package com.poudy.feedback.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.poudy.feedback.domain.FeedbackImage;
import com.poudy.feedback.domain.FeedbackImageFormat;
import com.poudy.feedback.repository.S3FeedbackImageRepository.PendingImage;
import com.poudy.feedback.service.PendingImageBatch.OwnedImage;
import com.poudy.feedback.service.PendingImageBatch.RelayPlan;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("pending 의견 이미지 묶음")
class PendingImageBatchTest {

    private static final Instant NOW = Instant.parse("2026-09-19T00:00:00Z");

    @Test
    @DisplayName("소유 이미지와 유예가 끝난 미사용 이미지를 입력 순서대로 분류한다")
    void plansOwnedAndExpiredImagesInOrder() {
        UUID firstFeedbackId = UUID.randomUUID();
        UUID secondFeedbackId = UUID.randomUUID();
        PendingImage firstOwned = pending(NOW.minusSeconds(60));
        PendingImage freshOrphan = pending(NOW.minusSeconds(60));
        PendingImage expiredOrphan = pending(NOW.minus(Duration.ofDays(2)));
        PendingImage secondOwned = pending(NOW.minus(Duration.ofDays(2)));
        PendingImageBatch batch = new PendingImageBatch(
            List.of(firstOwned, freshOrphan, expiredOrphan, secondOwned)
        );

        RelayPlan plan = batch.plan(
            Map.of(
                firstOwned.image().id(),
                firstFeedbackId,
                secondOwned.image().id(),
                secondFeedbackId
            ),
            NOW
        );

        assertThat(batch.imageIds()).containsExactly(
            firstOwned.image().id(),
            freshOrphan.image().id(),
            expiredOrphan.image().id(),
            secondOwned.image().id()
        );
        assertThat(plan.ownedImages()).containsExactly(
            new OwnedImage(firstFeedbackId, firstOwned.image()),
            new OwnedImage(secondFeedbackId, secondOwned.image())
        );
        assertThat(plan.expiredOrphans()).containsExactly(expiredOrphan.image());
    }

    private static PendingImage pending(Instant lastModified) {
        FeedbackImage image = new FeedbackImage(UUID.randomUUID(), FeedbackImageFormat.PNG);
        return new PendingImage(image, "etag", lastModified);
    }
}
