package com.poudy.user.controller.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record ProfileImageUploadResponse(
    @NotNull @Schema(example = "8f8ba9b8-4da7-46c7-9f97-3d86aa7de2bf") UUID imageId) {
}
