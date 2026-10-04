package com.poudy.member.controller.dto;

import com.poudy.member.domain.AgeRange;
import com.poudy.member.domain.Gender;
import com.poudy.member.domain.MemberSkinType;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

public record MemberProfileRequest(
    @NotNull(message = "INVALID_REQUEST_BODY") @Schema(example = "FEMALE") Gender gender,
    @NotNull(message = "INVALID_REQUEST_BODY") @Schema(example = "TWENTIES") AgeRange ageRange,
    @NotNull(message = "INVALID_REQUEST_BODY") @Schema(example = "COMBINATION") MemberSkinType skinType) {
}
