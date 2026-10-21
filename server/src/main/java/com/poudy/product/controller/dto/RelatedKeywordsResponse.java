package com.poudy.product.controller.dto;

import com.poudy.product.domain.RelatedKeywords;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record RelatedKeywordsResponse(
    @NotNull @Schema(description = "제품 검색 결과 순서의 제품명 최대 5개. 없으면 빈 배열") List<RelatedKeywordResponse> items) {

    public static RelatedKeywordsResponse from(RelatedKeywords keywords) {
        return new RelatedKeywordsResponse(keywords.mapItems(RelatedKeywordResponse::from));
    }
}
