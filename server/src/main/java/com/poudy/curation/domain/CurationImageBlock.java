package com.poudy.curation.domain;

import com.poudy.product.domain.Products;
import jakarta.persistence.Column;
import jakarta.persistence.DiscriminatorValue;
import jakarta.persistence.Entity;
import jakarta.persistence.PostLoad;
import java.util.Optional;
import java.util.UUID;

@Entity
@DiscriminatorValue("IMAGE")
final class CurationImageBlock extends CurationBlock {

    @Column(name = "image_url")
    private String imageUrl;

    protected CurationImageBlock() {
    }

    CurationImageBlock(UUID id, int spacingTop, int spacingBottom, String imageUrl) {
        super(id, spacingTop, spacingBottom);
        this.imageUrl = imageUrl;
        validate();
    }

    @PostLoad
    private void load() {
        validateBlock();
        validate();
    }

    private void validate() {
        if (imageUrl == null || imageUrl.isBlank()) {
            throw new IllegalArgumentException("이미지 블록의 URL이 필요합니다.");
        }
    }

    @Override
    Optional<CurationBlockContent> resolveContent(Products products) {
        return Optional.of(new CurationBlockContent.Image(id(), spacingTop(), spacingBottom(), imageUrl));
    }
}
