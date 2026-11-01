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
    @NotNull @Schema(example = "포근한 다람쥐 1000") String nickname,
    @Schema(nullable = true, requiredMode = Schema.RequiredMode.REQUIRED, example = "https://bucket.s3.ap-northeast-2.amazonaws.com/poudy/users/profile/8f8ba9b8-4da7-46c7-9f97-3d86aa7de2bf") String profileImageUrl,
    @Schema(nullable = true, requiredMode = Schema.RequiredMode.REQUIRED) Gender gender,
    @Schema(nullable = true, requiredMode = Schema.RequiredMode.REQUIRED) AgeRange ageRange,
    @Schema(nullable = true, requiredMode = Schema.RequiredMode.REQUIRED) SkinType skinType,
    @Schema(nullable = true, requiredMode = Schema.RequiredMode.REQUIRED) Boolean sensitiveSkin,
    @Schema(requiredMode = Schema.RequiredMode.NOT_REQUIRED, description = "신규 가입 프로필 설정 완료 여부. false이면 로그인 후 프로필 설정으로 이동") Boolean profileSetupCompleted) {

    public static UserResponse from(User user, String profileImageUrl) {
        return new UserResponse(
            user.id(),
            user.provider(),
            user.email(),
            user.nickname(),
            profileImageUrl,
            user.gender(),
            user.ageRange(),
            user.skinType(),
            user.sensitiveSkin(),
            user.profileSetupCompleted()
        );
    }
}
