package com.poudy.feedback.controller.dto;

import com.poudy.feedback.domain.Feedback;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.UUID;

public record FeedbackImageUploadResponse(
    @NotNull @Size(min = 1, max = Feedback.MAX_IMAGE_COUNT) @Schema(description = "요청한 이미지 순서의 일회성 ID") List<@NotNull UUID> imageIds) {

    public FeedbackImageUploadResponse {
        imageIds = List.copyOf(imageIds);
    }
}
