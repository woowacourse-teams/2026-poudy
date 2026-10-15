package com.poudy.user.controller.dto;

import com.poudy.security.domain.OAuthProvider;
import com.poudy.skintype.domain.SkinType;
import com.poudy.user.domain.AgeRange;
import com.poudy.user.domain.Gender;
import com.poudy.user.domain.User;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

public record UserResponse(
    @NotNull @Schema(example = "1") Long id,
    @NotNull @Schema(example = "KAKAO") OAuthProvider provider,
    @NotNull @Schema(example = "user@example.com") String email,
    @Schema(nullable = true, requiredMode = Schema.RequiredMode.REQUIRED) Gender gender,
    @Schema(nullable = true, requiredMode = Schema.RequiredMode.REQUIRED) AgeRange ageRange,
    @Schema(nullable = true, requiredMode = Schema.RequiredMode.REQUIRED) SkinType skinType) {

    public static UserResponse from(User user) {
        return new UserResponse(
            user.id(),
            user.provider(),
            user.email(),
            user.gender(),
            user.ageRange(),
            user.skinType()
        );
    }
}
