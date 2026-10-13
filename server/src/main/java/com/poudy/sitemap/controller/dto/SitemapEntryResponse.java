package com.poudy.sitemap.controller.dto;

import com.poudy.sitemap.domain.ContentUpdate;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.time.OffsetDateTime;
import java.util.List;

public record SitemapEntryResponse(
    @NotNull @Schema(example = "12") Long id,
    @NotNull @Schema(example = "2026-08-01T09:30:00+09:00") OffsetDateTime updatedAt) {

    public static List<SitemapEntryResponse> from(List<ContentUpdate> updates) {
        return updates.stream()
            .map(update -> new SitemapEntryResponse(update.id(), update.updatedAt()))
            .toList();
    }
}
