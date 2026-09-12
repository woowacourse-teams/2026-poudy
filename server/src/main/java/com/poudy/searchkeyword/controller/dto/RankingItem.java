package com.poudy.searchkeyword.controller.dto;

import com.poudy.searchkeyword.domain.ranking.RankedKeyword;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

public record RankingItem(
    @NotNull @Schema(example = "1") Integer rank,
    @NotNull @Schema(example = "토너") String keyword) {

    public static RankingItem from(RankedKeyword ranked) {
        return new RankingItem(ranked.rank(), ranked.keyword());
    }
}
