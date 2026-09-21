package com.poudy.curation.domain;

import com.poudy.product.domain.Products;
import java.util.List;
import java.util.Objects;

public final class CurationDetail {
    private final CurationPublicationStatus publicationStatus;
    private final CurationBlocks blocks;

    private CurationDetail(CurationPublicationStatus publicationStatus, CurationBlocks blocks) {
        this.publicationStatus = publicationStatus;
        this.blocks = blocks;
    }

    public static CurationDetail from(CurationPublicationStatus publicationStatus, List<CurationBlock> blocks) {
        return new CurationDetail(
            Objects.requireNonNull(publicationStatus),
            CurationBlocks.from(blocks)
        );
    }

    boolean isPublished() {
        return publicationStatus.isPublished();
    }

    List<CurationBlockContent> resolveBlocks(Products products) {
        return blocks.resolveContent(products);
    }
}
