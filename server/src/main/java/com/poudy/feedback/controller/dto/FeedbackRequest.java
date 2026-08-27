package com.poudy.feedback.controller.dto;

import com.poudy.feedback.domain.Feedback;
import com.poudy.feedback.domain.FeedbackContent;
import com.poudy.feedback.domain.FeedbackPath;
import com.poudy.feedback.domain.FeedbackType;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.UUID;

public record FeedbackRequest(
        @NotNull(message = "INVALID_REQUEST_BODY") @Schema(description = "의견 유형", example = "DATA_CORRECTION") FeedbackType type,
        @NotBlank(message = "INVALID_REQUEST_BODY") @Size(min = FeedbackContent.MIN_LENGTH, max = FeedbackContent.MAX_LENGTH, message = "INVALID_REQUEST_BODY") @Schema(example = "제품 정보가 실제 패키지와 달라요.") String content,
        @NotBlank(message = "INVALID_REQUEST_BODY") @Size(min = 1, max = FeedbackPath.MAX_LENGTH, message = "INVALID_REQUEST_BODY") @Schema(description = "의견을 작성한 화면 경로", example = "/products/12345") String path,
        @Size(max = Feedback.MAX_IMAGE_COUNT, message = "INVALID_FEEDBACK_IMAGE_ID") @Schema(description = "미리 업로드한 선택적 이미지 ID 목록", nullable = true) List<@NotNull(message = "INVALID_FEEDBACK_IMAGE_ID") UUID> imageIds) {

    public FeedbackRequest {
        imageIds = copyOf(imageIds);
    }

    private static List<UUID> copyOf(List<UUID> imageIds) {
        if (imageIds == null) {
            return List.of();
        }

        return java.util.Collections.unmodifiableList(new java.util.ArrayList<>(imageIds));
    }
}
