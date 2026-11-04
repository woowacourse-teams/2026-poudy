package com.poudy.routine.controller.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

public record RoutineAuthorResponse(
    @NotNull @Schema(example = "촉촉한판다") String nickname,
    @Schema(nullable = true, requiredMode = Schema.RequiredMode.REQUIRED, example = "https://bucket.s3.ap-northeast-2.amazonaws.com/poudy/users/profile/8f8ba9b8-4da7-46c7-9f97-3d86aa7de2bf") String profileImageUrl) {
}
