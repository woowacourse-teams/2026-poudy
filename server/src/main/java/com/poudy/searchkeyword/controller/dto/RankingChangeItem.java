package com.poudy.searchkeyword.controller.dto;

import com.poudy.searchkeyword.domain.ranking.RankingChange;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

public record RankingChangeItem(
    @NotNull @Schema(example = "UP") String movement,
    @NotNull @Schema(example = "2") Integer steps) {

    public static RankingChangeItem from(RankingChange change) {
        return new RankingChangeItem(change.movementName(), change.steps());
    }
}
