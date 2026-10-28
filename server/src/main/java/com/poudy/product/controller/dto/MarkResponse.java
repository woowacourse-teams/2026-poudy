package com.poudy.product.controller.dto;

import com.poudy.product.domain.Mark;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record MarkResponse(
    @NotNull @Schema(description = "표식 코드", example = "DAISO") String code,
    @NotNull @Schema(description = "표식 표시명", example = "다이소") String name) {

    public static List<MarkResponse> from(List<Mark> marks) {
        return marks.stream().sorted().map(mark -> new MarkResponse(mark.code(), mark.displayName())).toList();
    }

    public static List<MarkResponse> forList(List<Mark> marks) {
        return marks.stream().filter(Mark::isVisibleInProductList)
            .map(mark -> new MarkResponse(mark.code(), mark.displayName())).toList();
    }
}
