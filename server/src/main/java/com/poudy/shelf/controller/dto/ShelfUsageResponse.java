package com.poudy.shelf.controller.dto;

import com.poudy.shelf.domain.Shelf;
import com.poudy.shelf.domain.ShelfTab;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.util.Arrays;
import java.util.List;

public record ShelfUsageResponse(
    @NotNull @Schema(example = "ALL") ShelfTab code,
    @NotNull @Schema(example = "전체") String name,
    @NotNull @Schema(example = "3") Long count) {

    public static List<ShelfUsageResponse> from(Shelf shelf) {
        return Arrays.stream(ShelfTab.values())
            .map(tab -> new ShelfUsageResponse(tab, tab.displayName(), shelf.count(tab)))
            .toList();
    }
}
