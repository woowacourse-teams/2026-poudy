package com.poudy.curation.domain;

import com.poudy.product.domain.Product;
import com.poudy.product.domain.Products;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

final class CurationProductsBlock extends CurationBlock {
    private final List<Long> productIds;

    CurationProductsBlock(UUID id, int spacingTop, int spacingBottom, List<Long> productIds) {
        super(id, spacingTop, spacingBottom);
        this.productIds = List.copyOf(productIds);
        if (this.productIds.stream().anyMatch(productId -> productId == null || productId <= 0)) {
            throw new IllegalArgumentException("제품 ID는 양의 정수여야 합니다.");
        }
        if (new HashSet<>(this.productIds).size() != this.productIds.size()) {
            throw new IllegalArgumentException("블록의 제품 ID가 중복됐습니다.");
        }
    }

    @Override
    Optional<CurationBlockContent> resolveContent(Products products) {
        List<Product> available = productIds.stream().flatMap(id -> products.findById(id).stream()).toList();
        if (available.isEmpty()) {
            return Optional.empty();
        }
        return Optional.of(new CurationBlockContent.Products(id(), spacingTop(), spacingBottom(), available));
    }
}
