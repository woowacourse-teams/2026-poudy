package com.poudy.curation.controller.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import java.util.UUID;

public record CurationImageBlockResponse(
    @NotNull UUID id,
    @NotNull @Schema(allowableValues = "IMAGE") String type,
    @NotNull @PositiveOrZero @Schema(description = "위 여백 (px)") Integer spacingTop,
    @NotNull @PositiveOrZero @Schema(description = "아래 여백 (px)") Integer spacingBottom,
    @NotNull String imageUrl,
    @Schema(description = "짧은 대체 설명(최대 500자). null은 미입력, 빈 문자열은 장식용 이미지", nullable = true, requiredMode = Schema.RequiredMode.REQUIRED) String altText,
    @Schema(description = "전체 접근성 본문. null은 미입력이며 줄바꿈과 공백을 그대로 제공한다", nullable = true, requiredMode = Schema.RequiredMode.REQUIRED) String bodyText)
    implements
        CurationBlockResponse {
}
