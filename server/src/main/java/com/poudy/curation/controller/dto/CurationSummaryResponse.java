package com.poudy.curation.controller.dto;

import com.poudy.curation.domain.Curation;
import com.poudy.curation.domain.CurationBanner;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

public record CurationSummaryResponse(
    @NotNull @Schema(description = "큐레이션 ID", example = "12") Long id,
    @NotNull @Schema(description = "웹 경로 표시값. 영문 소문자, 숫자, 하이픈으로 구성하며 중복을 허용한다.", example = "seasonal-skin-care", pattern = "^[a-z0-9-]+$") String slug,
    @NotNull @Schema(description = "배너 제목", example = "환절기 장벽 케어") String title,
    @NotNull @Schema(description = "배너 설명", example = "환절기를 위한 제품 모음") String description,
    @NotNull @Schema(description = "상세 이미지와 독립적인 배너 썸네일 URL", example = "https://cdn.example.com/curations/banner.png") String thumbnailImageUrl) {

    public static CurationSummaryResponse from(Curation curation) {
        CurationBanner banner = curation.banner();
        return new CurationSummaryResponse(
            curation.id(),
            curation.slug(),
            banner.title(),
            banner.description(),
            banner.thumbnailImageUrl()
        );
    }
}
