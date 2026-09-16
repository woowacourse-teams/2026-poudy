package com.poudy.curation.controller.dto;

import com.poudy.curation.domain.Curation;
import com.poudy.curation.domain.CurationDetail;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record CurationDetailResponse(
    @NotNull @Schema(description = "큐레이션 ID", example = "12") Long id,
    @NotNull @Schema(description = "큐레이션 상세 제목") String title,
    @NotNull @Schema(description = "큐레이션 상세 설명") String description,
    @NotNull @Schema(description = "노출 가능한 블록 목록. 저장 순서를 유지하며 빈 배열일 수 있다.") List<CurationBlockResponse> blocks) {

    public static CurationDetailResponse from(CurationDetail detail) {
        Curation curation = detail.curation();
        return new CurationDetailResponse(
            curation.id(),
            curation.title(),
            curation.description(),
            detail.blocks().stream().map(CurationBlockResponse::from).toList()
        );
    }
}
