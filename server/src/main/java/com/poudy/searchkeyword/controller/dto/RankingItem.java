package com.poudy.searchkeyword.controller.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

public record RankingItem(
    @NotNull @Schema(example = "1") Integer rank,
    @NotNull @Schema(example = "토너") String keyword) {
}
