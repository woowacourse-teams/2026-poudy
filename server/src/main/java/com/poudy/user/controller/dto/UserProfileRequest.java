package com.poudy.user.controller.dto;

import com.poudy.skintype.domain.SkinType;
import com.poudy.user.domain.AgeRange;
import com.poudy.user.domain.Gender;
import io.swagger.v3.oas.annotations.media.Schema;

public record UserProfileRequest(
    @Schema(nullable = true, requiredMode = Schema.RequiredMode.REQUIRED, example = "FEMALE") Gender gender,
    @Schema(nullable = true, requiredMode = Schema.RequiredMode.REQUIRED, example = "TWENTIES") AgeRange ageRange,
    @Schema(nullable = true, requiredMode = Schema.RequiredMode.REQUIRED, example = "COMBINATION") SkinType skinType) {
}
