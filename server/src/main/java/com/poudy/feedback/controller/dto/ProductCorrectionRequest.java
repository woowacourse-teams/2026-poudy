package com.poudy.feedback.controller.dto;

import com.poudy.feedback.domain.Feedback;
import com.poudy.feedback.domain.FeedbackContent;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

public record ProductCorrectionRequest(
    @NotBlank(message = "INVALID_REQUEST_BODY") @Size(min = FeedbackContent.MIN_LENGTH, max = FeedbackContent.MAX_LENGTH, message = "INVALID_REQUEST_BODY") @Schema(example = "전성분 표기가 실제 패키지와 달라요.") String content,
    @Size(max = Feedback.MAX_IMAGE_COUNT, message = "INVALID_FEEDBACK_IMAGE_ID") @Schema(nullable = true) List<@NotNull(message = "INVALID_FEEDBACK_IMAGE_ID") UUID> imageIds) {

    public ProductCorrectionRequest {
        imageIds = copyOf(imageIds);
    }

    private static List<UUID> copyOf(List<UUID> imageIds) {
        if (imageIds == null) {
            return List.of();
        }

        return Collections.unmodifiableList(new ArrayList<>(imageIds));
    }
}
