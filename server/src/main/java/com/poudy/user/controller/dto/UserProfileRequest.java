package com.poudy.user.controller.dto;

import com.poudy.skintype.domain.SkinType;
import com.poudy.user.domain.AgeRange;
import com.poudy.user.domain.Gender;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.UUID;
import tools.jackson.databind.annotation.JsonDeserialize;

public record UserProfileRequest(
    @Schema(nullable = true, requiredMode = Schema.RequiredMode.REQUIRED, example = "FEMALE") Gender gender,
    @Schema(nullable = true, requiredMode = Schema.RequiredMode.REQUIRED, example = "TWENTIES") AgeRange ageRange,
    @Schema(nullable = true, requiredMode = Schema.RequiredMode.REQUIRED, example = "COMBINATION") SkinType skinType,
    @Schema(nullable = true, requiredMode = Schema.RequiredMode.REQUIRED, example = "true") Boolean sensitiveSkin,
    @Schema(implementation = UUID.class, nullable = true, requiredMode = Schema.RequiredMode.NOT_REQUIRED, example = "8f8ba9b8-4da7-46c7-9f97-3d86aa7de2bf") @JsonDeserialize(using = ProfileImageInputDeserializer.class) ProfileImageInput profileImageId) {
}
