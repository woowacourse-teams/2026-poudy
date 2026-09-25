package com.poudy.curation.domain;

import com.poudy.product.domain.Products;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

public abstract sealed class CurationBlock permits CurationImageBlock, CurationProductsBlock,
    CurationProductsByFilterBlock {

    private final UUID id;
    private final int spacingTop;
    private final int spacingBottom;

    protected CurationBlock(UUID id, int spacingTop, int spacingBottom) {
        this.id = id;
        this.spacingTop = spacingTop;
        this.spacingBottom = spacingBottom;
        validateBlock();
    }

    private void validateBlock() {
        Objects.requireNonNull(id);
        if (spacingTop < 0 || spacingBottom < 0) {
            throw new IllegalArgumentException("블록 여백은 음수일 수 없습니다.");
        }
    }

    public static CurationBlock image(UUID id, int spacingTop, int spacingBottom, String imageUrl) {
        return new CurationImageBlock(id, spacingTop, spacingBottom, imageUrl);
    }

    public static CurationBlock products(
        UUID id,
        int spacingTop,
        int spacingBottom,
        List<Long> productIds
    ) {
        return new CurationProductsBlock(id, spacingTop, spacingBottom, productIds);
    }

    public static CurationBlock productsByFilter(
        UUID id,
        int spacingTop,
        int spacingBottom,
        List<CurationFilter> filters,
        List<CurationProductMapping> products
    ) {
        return new CurationProductsByFilterBlock(id, spacingTop, spacingBottom, filters, products);
    }

    public UUID id() {
        return id;
    }

    protected final int spacingTop() {
        return spacingTop;
    }

    protected final int spacingBottom() {
        return spacingBottom;
    }

    abstract Optional<CurationBlockContent> resolveContent(Products products);

    List<Long> productIds() {
        return List.of();
    }
}
