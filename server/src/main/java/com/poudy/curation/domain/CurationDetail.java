package com.poudy.curation.domain;

import com.poudy.product.domain.Products;
import java.util.List;

public final class CurationDetail {
    private final CurationBlocks blocks;

    private CurationDetail(CurationBlocks blocks) {
        this.blocks = blocks;
    }

    public static CurationDetail from(List<CurationBlock> blocks) {
        return new CurationDetail(CurationBlocks.from(blocks));
    }

    List<CurationBlockContent> resolveBlocks(Products products) {
        return blocks.resolveContent(products);
    }
}
