package com.poudy.searchkeyword.controller.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

public record RankingChangeItem(
    @NotNull @Schema(example = "UP") String movement,
    @NotNull @Schema(example = "2") Integer steps) {
}
