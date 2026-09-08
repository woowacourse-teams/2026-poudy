package com.poudy.curation.controller.dto;

import com.poudy.curation.domain.Curation;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

public record CurationSummaryResponse(
    @NotNull @Schema(description = "큐레이션 ID", example = "12") Long id,
    @NotNull @Schema(description = "큐레이션 제목", example = "환절기 장벽 케어") String title,
    @NotNull @Schema(description = "큐레이션 간단 설명", example = "환절기를 위한 제품 모음") String description,
    @NotNull @Schema(description = "목록 대표 이미지 URL", example = "https://cdn.example.com/curations/12/main.png") String imageUrl) {

    public static CurationSummaryResponse from(Curation curation) {
        return new CurationSummaryResponse(
            curation.id(),
            curation.title(),
            curation.summary(),
            curation.representativeImageUrl()
        );
    }
}
