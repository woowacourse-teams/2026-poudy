package com.poudy.member.controller.dto;

import com.poudy.member.domain.AgeRange;
import com.poudy.member.domain.Gender;
import com.poudy.member.domain.MemberSkinType;
import io.swagger.v3.oas.annotations.media.Schema;

public record MemberProfileRequest(
    @Schema(nullable = true, requiredMode = Schema.RequiredMode.REQUIRED, example = "FEMALE") Gender gender,
    @Schema(nullable = true, requiredMode = Schema.RequiredMode.REQUIRED, example = "TWENTIES") AgeRange ageRange,
    @Schema(nullable = true, requiredMode = Schema.RequiredMode.REQUIRED, example = "COMBINATION") MemberSkinType skinType) {
}
