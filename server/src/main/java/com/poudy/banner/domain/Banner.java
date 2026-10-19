package com.poudy.banner.domain;

import com.poudy.curation.domain.CurationProductLinkQuery;
import java.util.Objects;
import java.util.Set;

public final class Banner {
    private final long id;
    private final String title;
    private final String description;
    private final String imageUrl;
    private final BannerTarget target;

    public Banner(long id, String title, String description, String imageUrl, BannerTarget target) {
        if (id <= 0 || title == null || title.isBlank() || description == null || description.isBlank()
            || imageUrl == null || imageUrl.isBlank()) {
            throw new IllegalArgumentException("공개 배너의 ID·제목·설명·이미지가 필요합니다.");
        }
        Objects.requireNonNull(target);
        this.id = id;
        this.title = title;
        this.description = description;
        this.imageUrl = imageUrl;
        this.target = target;
    }

    public long id() {
        return id;
    }

    public String title() {
        return title;
    }

    public String description() {
        return description;
    }

    public String imageUrl() {
        return imageUrl;
    }

    public BannerTarget target() {
        return target;
    }

    public boolean isAvailable(Set<Long> publishedCurations, Set<CurationProductLinkQuery> invalidQueries) {
        return target.isAvailable(publishedCurations, invalidQueries);
    }
}
