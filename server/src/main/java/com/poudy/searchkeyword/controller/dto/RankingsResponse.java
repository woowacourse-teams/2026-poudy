package com.poudy.searchkeyword.controller.dto;

import com.poudy.searchkeyword.domain.ranking.RankedKeyword;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record RankingsResponse(@NotNull List<RankingItem> items) {

    public static RankingsResponse from(List<RankedKeyword> rankings) {
        return new RankingsResponse(rankings.stream().map(RankingItem::from).toList());
    }
}
