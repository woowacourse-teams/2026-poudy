package com.poudy.curation.domain;

import com.poudy.product.domain.Products;
import java.util.Optional;
import java.util.UUID;

final class CurationImageBlock extends CurationBlock {
    private final String imageUrl;

    CurationImageBlock(UUID id, Status status, int spacingTop, int spacingBottom, String imageUrl) {
        super(id, status, spacingTop, spacingBottom);
        if (status == Status.VISIBLE && (imageUrl == null || imageUrl.isBlank())) {
            throw new IllegalArgumentException("공개 이미지 블록의 URL이 필요합니다.");
        }
        this.imageUrl = imageUrl;
    }

    @Override
    Optional<CurationBlockContent> visibleContent(Products products) {
        if (!isVisible()) {
            return Optional.empty();
        }
        return Optional.of(new CurationBlockContent.Image(id(), spacingTop(), spacingBottom(), imageUrl));
    }
}
