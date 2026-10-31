package com.poudy.feedback.controller.dto;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record AdminFeedbackImageResponse(@NotNull UUID imageId) {
}
