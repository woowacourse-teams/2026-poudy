package com.poudy.curation.domain;

import com.poudy.product.domain.Products;
import java.util.Optional;
import java.util.UUID;

final class CurationImageBlock extends CurationBlock {
    private final String imageUrl;

    CurationImageBlock(UUID id, int spacingTop, int spacingBottom, String imageUrl) {
        super(id, spacingTop, spacingBottom);
        if (imageUrl == null || imageUrl.isBlank()) {
            throw new IllegalArgumentException("이미지 블록의 URL이 필요합니다.");
        }
        this.imageUrl = imageUrl;
    }

    @Override
    Optional<CurationBlockContent> resolveContent(Products products) {
        return Optional.of(new CurationBlockContent.Image(id(), spacingTop(), spacingBottom(), imageUrl));
    }
}
