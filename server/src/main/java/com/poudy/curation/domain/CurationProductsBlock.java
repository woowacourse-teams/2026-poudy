package com.poudy.curation.domain;

import com.poudy.product.domain.Product;
import com.poudy.product.domain.Products;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.DiscriminatorValue;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.PostLoad;
import jakarta.persistence.Transient;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Entity
@DiscriminatorValue("PRODUCTS")
final class CurationProductsBlock extends CurationBlock {

    @ElementCollection
    @CollectionTable(name = "curation_block_product", joinColumns = @JoinColumn(name = "block_id"))
    @OrderColumn(name = "position")
    @Column(name = "product_id")
    private List<Long> productIdRows;

    @Transient
    private List<Long> productIds;

    protected CurationProductsBlock() {
    }

    CurationProductsBlock(UUID id, int spacingTop, int spacingBottom, List<Long> productIds) {
        super(id, spacingTop, spacingBottom);
        this.productIds = List.copyOf(productIds);
        this.productIdRows = this.productIds;
        validate();
    }

    @PostLoad
    private void load() {
        validateBlock();
        this.productIds = List.copyOf(productIdRows);
        validate();
    }

    private void validate() {
        if (productIds.stream().anyMatch(productId -> productId == null || productId <= 0)) {
            throw new IllegalArgumentException("제품 ID는 양의 정수여야 합니다.");
        }
        if (new HashSet<>(productIds).size() != productIds.size()) {
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
