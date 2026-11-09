package com.poudy.skintype.controller.dto;

import com.poudy.skintype.domain.SkinChoice;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

public record SkinChoiceResponse(
    @NotNull @Schema(description = "피부 선택지 코드. SENSITIVE는 목록 쿼리와 회원 프로필의 sensitiveSkin=true에 해당한다", example = "DRY") SkinChoice code,
    @NotNull @Schema(description = "피부 선택지 표시명", example = "건성") String name) {

    public static SkinChoiceResponse from(SkinChoice choice) {
        return new SkinChoiceResponse(choice, choice.getDisplayName());
    }
}
