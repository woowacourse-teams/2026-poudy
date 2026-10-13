package com.poudy.sitemap.controller.dto;

import com.poudy.sitemap.domain.ContentUpdates;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record SitemapResponse(
    @NotNull List<SitemapEntryResponse> categories,
    @NotNull List<SitemapEntryResponse> brands,
    @NotNull List<SitemapEntryResponse> curations,
    @NotNull List<SitemapEntryResponse> ingredients) {

    public static SitemapResponse from(ContentUpdates updates) {
        return new SitemapResponse(
            SitemapEntryResponse.from(updates.categories()),
            SitemapEntryResponse.from(updates.brands()),
            SitemapEntryResponse.from(updates.curations()),
            SitemapEntryResponse.from(updates.ingredients())
        );
    }
}
