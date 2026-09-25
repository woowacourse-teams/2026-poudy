package com.poudy.feedback.controller.dto;

import com.poudy.feedback.domain.image.FeedbackImage;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record AdminFeedbackImageResponse(@NotNull UUID imageId, @NotNull String extension) {

    public static AdminFeedbackImageResponse from(FeedbackImage image) {
        return new AdminFeedbackImageResponse(image.id(), image.format().extension());
    }
}
