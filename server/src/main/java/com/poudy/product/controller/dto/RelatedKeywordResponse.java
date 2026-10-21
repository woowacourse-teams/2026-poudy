package com.poudy.product.controller.dto;

import com.poudy.product.domain.RelatedKeyword;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

public record RelatedKeywordResponse(
    @NotNull @Schema(description = "검색어와 일치한 제품명", example = "수분 토너") String keyword,
    @NotNull @Schema(description = "입력 부분의 UTF-16 반열림 강조 구간. 오타 교정 시 교정된 부분") RelatedKeywordMatchResponse match) {

    public static RelatedKeywordResponse from(RelatedKeyword keyword) {
        return new RelatedKeywordResponse(
            keyword.keyword(),
            new RelatedKeywordMatchResponse(keyword.startIndex(), keyword.endIndexExclusive())
        );
    }
}
