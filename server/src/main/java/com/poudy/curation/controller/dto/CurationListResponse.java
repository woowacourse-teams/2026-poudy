package com.poudy.curation.controller.dto;

import com.poudy.curation.domain.Curation;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record CurationListResponse(@NotNull List<CurationSummaryResponse> items) {

    public static CurationListResponse from(List<Curation> curations) {
        return new CurationListResponse(
            curations.stream()
                .map(CurationSummaryResponse::from)
                .toList()
        );
    }
}
