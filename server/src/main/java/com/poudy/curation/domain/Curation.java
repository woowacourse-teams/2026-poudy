package com.poudy.curation.domain;

import com.poudy.product.domain.Products;
import java.util.List;
import java.util.Objects;

public final class Curation {
    private final Long id;
    private final String title;
    private final String description;
    private final CurationBanner banner;
    private final CurationDetail detail;

    public Curation(
        Long id,
        String title,
        String description,
        CurationBanner banner,
        CurationDetail detail
    ) {
        if (id == null || id <= 0) {
            throw new IllegalArgumentException("큐레이션 ID는 양의 정수여야 합니다.");
        }
        String validatedTitle = requireNonBlank(title, "큐레이션 제목");
        String validatedDescription = requireNonBlank(description, "큐레이션 설명");
        CurationBanner validatedBanner = Objects.requireNonNull(banner);
        CurationDetail validatedDetail = Objects.requireNonNull(detail);
        if (validatedBanner.isPublished() && !validatedDetail.isPublished()) {
            throw new IllegalArgumentException("상세가 미게시된 큐레이션은 배너를 게시할 수 없습니다.");
        }

        this.id = id;
        this.title = validatedTitle;
        this.description = validatedDescription;
        this.banner = validatedBanner;
        this.detail = validatedDetail;
    }

    public Long id() {
        return id;
    }

    public String title() {
        return title;
    }

    public String description() {
        return description;
    }

    public String thumbnailImageUrl() {
        return banner.thumbnailImageUrl();
    }

    boolean isBannerPublished() {
        return banner.isPublished();
    }

    boolean isDetailPublished() {
        return detail.isPublished();
    }

    List<CurationBlockContent> resolveBlocks(Products products) {
        return detail.resolveBlocks(products);
    }

    private static String requireNonBlank(String value, String fieldName) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(fieldName + "이 필요합니다.");
        }
        return value;
    }
}
