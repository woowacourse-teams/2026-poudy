package com.poudy.curation.domain;

import com.poudy.product.domain.Products;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

final class CurationBlocks {
    private final List<CurationBlock> blocks;

    private CurationBlocks(List<CurationBlock> blocks) {
        this.blocks = blocks;
    }

    static CurationBlocks from(List<CurationBlock> blocks) {
        List<CurationBlock> copiedBlocks = List.copyOf(blocks);
        Set<UUID> blockIds = new HashSet<>();
        for (CurationBlock block : copiedBlocks) {
            if (!blockIds.add(block.id())) {
                throw new IllegalArgumentException("큐레이션의 블록 ID가 중복됐습니다.");
            }
        }
        return new CurationBlocks(copiedBlocks);
    }

    List<CurationBlockContent> resolveContent(Products products) {
        return blocks.stream().flatMap(block -> block.resolveContent(products).stream()).toList();
    }
}
