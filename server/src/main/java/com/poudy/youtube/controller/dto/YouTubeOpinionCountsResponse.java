package com.poudy.youtube.controller.dto;

import com.poudy.youtube.domain.YouTubeOpinionCounts;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

@Schema(description = "게시된 공개 영상에서 제품마다 낸 의견을 영상×제품 한 건씩 센 값")
public record YouTubeOpinionCountsResponse(
    @NotNull @Schema(description = "추천(recommended)", example = "6") long recommended,
    @NotNull @Schema(description = "엇갈림(mixed)", example = "6") long mixed,
    @NotNull @Schema(description = "비추천(not_recommended)", example = "4") long notRecommended,
    @NotNull @Schema(description = "그 외. 정보성(neutral)과 판단 어려움(uncertain)을 합친 값", example = "2") long other) {
    public static YouTubeOpinionCountsResponse from(YouTubeOpinionCounts value) {
        return new YouTubeOpinionCountsResponse(
            value.recommended(),
            value.mixed(),
            value.notRecommended(),
            value.other()
        );
    }
}
