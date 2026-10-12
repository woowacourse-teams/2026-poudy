package com.poudy.sitemap.domain;

import java.util.List;

public record ContentUpdates(
    List<ContentUpdate> categories,
    List<ContentUpdate> brands,
    List<ContentUpdate> curations,
    List<ContentUpdate> ingredients) {
}
