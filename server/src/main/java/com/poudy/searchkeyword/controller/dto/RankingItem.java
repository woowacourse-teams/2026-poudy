package com.poudy.searchkeyword.controller.dto;

import com.poudy.searchkeyword.domain.ranking.RankedKeyword;
import com.poudy.searchkeyword.domain.ranking.RankingChange;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

public record RankingItem(
    @NotNull @Schema(example = "1") Integer rank,
    @NotNull @Schema(example = "토너") String keyword,
    RankingChangeItem change) {

    public static RankingItem from(RankedKeyword ranked) {
        return new RankingItem(ranked.rank(), ranked.keyword(), changeOf(ranked.change()));
    }

    private static RankingChangeItem changeOf(RankingChange change) {
        if (!change.isKnown()) {
            return null;
        }
        return new RankingChangeItem(change.movementName(), change.steps());
    }
}
