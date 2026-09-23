package com.poudy.curation.domain;

import com.poudy.product.domain.Products;
import java.util.List;
import java.util.Objects;

public final class Curation {

    private final Long id;
    private final String title;
    private final String description;
    private final CurationPublicationStatus publicationStatus;
    private final boolean bannerVisible;
    private final String bannerThumbnailImageUrl;
    private final CurationBlocks blockGroup;

    public Curation(
        Long id,
        String title,
        String description,
        CurationPublicationStatus publicationStatus,
        boolean bannerVisible,
        String bannerThumbnailImageUrl,
        List<CurationBlock> blocks
    ) {
        this.id = id;
        this.title = title;
        this.description = description;
        this.publicationStatus = publicationStatus;
        this.bannerVisible = bannerVisible;
        this.bannerThumbnailImageUrl = bannerThumbnailImageUrl;
        this.blockGroup = CurationBlocks.from(blocks);
        validate();
    }

    private void validate() {
        if (id == null || id <= 0) {
            throw new IllegalArgumentException("큐레이션 ID는 양의 정수여야 합니다.");
        }
        requireNonBlank(title, "큐레이션 제목");
        requireNonBlank(description, "큐레이션 설명");
        Objects.requireNonNull(publicationStatus);
        if (bannerVisible && bannerThumbnailImageUrl == null) {
            throw new IllegalArgumentException("노출할 배너의 썸네일 URL이 필요합니다.");
        }
        if (bannerThumbnailImageUrl != null && bannerThumbnailImageUrl.isBlank()) {
            throw new IllegalArgumentException("배너 썸네일 URL은 비어 있을 수 없습니다.");
        }
        if (bannerVisible && !publicationStatus.isPublished()) {
            throw new IllegalArgumentException("미게시 큐레이션은 배너에 노출할 수 없습니다.");
        }
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
        return bannerThumbnailImageUrl;
    }

    public List<Long> productIds() {
        return blockGroup.productIds();
    }

    boolean isBannerVisible() {
        return publicationStatus.isPublished() && bannerVisible;
    }

    boolean isPublished() {
        return publicationStatus.isPublished();
    }

    List<CurationBlockContent> resolveBlocks(Products products) {
        return blockGroup.resolveContent(products);
    }

    private static void requireNonBlank(String value, String fieldName) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(fieldName + "이 필요합니다.");
        }
    }
}
