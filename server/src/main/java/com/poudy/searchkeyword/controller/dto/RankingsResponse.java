package com.poudy.searchkeyword.controller.dto;

import jakarta.validation.constraints.NotNull;
import java.util.List;

public record RankingsResponse(@NotNull List<RankingItem> items) {
}
