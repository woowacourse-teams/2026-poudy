package com.poudy.curation.controller.dto;

import com.poudy.curation.domain.Curation;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record CurationDetailResponse(
    @NotNull @Schema(description = "큐레이션 ID", example = "12") Long id,
    @NotNull @Schema(description = "큐레이션 제목", example = "환절기 장벽 케어") String title,
    @NotNull @Schema(description = "큐레이션 상세 설명", example = "환절기에 피부 장벽 관리가 필요한 이유와 제품 선택 기준") String description,
    @NotNull @Schema(description = "상세 화면 이미지 URL 목록") List<String> imageUrls,
    @NotNull @Schema(description = "제품 필터에 사용할 카테고리 목록") List<CurationCategoryResponse> categories) {

    public static CurationDetailResponse from(Curation curation) {
        return new CurationDetailResponse(
            curation.id(),
            curation.title(),
            curation.description(),
            curation.imageUrls(),
            CurationCategoryResponse.from(curation.categories())
        );
    }
}
