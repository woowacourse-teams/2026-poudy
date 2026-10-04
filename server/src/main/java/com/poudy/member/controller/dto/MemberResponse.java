package com.poudy.member.controller.dto;

import com.poudy.member.domain.AgeRange;
import com.poudy.member.domain.Gender;
import com.poudy.member.domain.Member;
import com.poudy.member.domain.MemberSkinType;
import com.poudy.security.domain.OAuthProvider;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

public record MemberResponse(
    @NotNull @Schema(example = "1") Long id,
    @NotNull @Schema(example = "KAKAO") OAuthProvider provider,
    @NotNull @Schema(example = "member@example.com") String email,
    @Schema(nullable = true, requiredMode = Schema.RequiredMode.REQUIRED) Gender gender,
    @Schema(nullable = true, requiredMode = Schema.RequiredMode.REQUIRED) AgeRange ageRange,
    @Schema(nullable = true, requiredMode = Schema.RequiredMode.REQUIRED) MemberSkinType skinType,
    @NotNull @Schema(example = "false") Boolean profileCompleted) {

    public static MemberResponse from(Member member) {
        return new MemberResponse(
            member.id(),
            member.provider(),
            member.email(),
            member.gender(),
            member.ageRange(),
            member.skinType(),
            member.isProfileCompleted()
        );
    }
}
