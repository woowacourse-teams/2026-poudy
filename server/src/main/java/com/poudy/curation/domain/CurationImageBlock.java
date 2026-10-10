package com.poudy.curation.domain;

import com.poudy.product.domain.Products;
import java.util.Optional;
import java.util.UUID;

final class CurationImageBlock extends CurationBlock {

    private final String imageUrl;
    private final String altText;
    private final String bodyText;

    CurationImageBlock(UUID id, int spacingTop, int spacingBottom, String imageUrl, String altText, String bodyText) {
        super(id, spacingTop, spacingBottom);
        this.imageUrl = imageUrl;
        this.altText = altText;
        this.bodyText = bodyText;
        validate();
    }

    private void validate() {
        if (imageUrl == null || imageUrl.isBlank()) {
            throw new IllegalArgumentException("이미지 블록의 URL이 필요합니다.");
        }
        if (altText != null && altText.codePointCount(0, altText.length()) > 500) {
            throw new IllegalArgumentException("이미지 블록의 대체 설명은 500자 이하여야 합니다.");
        }
    }

    @Override
    Optional<CurationBlockContent> resolveContent(Products products) {
        return Optional
            .of(new CurationBlockContent.Image(id(), spacingTop(), spacingBottom(), imageUrl, altText, bodyText));
    }
}
