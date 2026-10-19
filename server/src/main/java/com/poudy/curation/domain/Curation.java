package com.poudy.curation.domain;

import com.poudy.product.domain.Products;
import java.util.List;
import java.util.Objects;

public final class Curation {

    private final Long id;
    private final String title;
    private final String description;
    private final CurationPublicationStatus publicationStatus;
    private final CurationBlocks blockGroup;

    public Curation(
        Long id,
        String title,
        String description,
        CurationPublicationStatus publicationStatus,
        List<CurationBlock> blocks
    ) {
        this.id = id;
        this.title = title;
        this.description = description;
        this.publicationStatus = publicationStatus;
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

    public List<Long> productIds() {
        return blockGroup.productIds();
    }

    public boolean isPublished() {
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
