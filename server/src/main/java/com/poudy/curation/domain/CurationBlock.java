package com.poudy.curation.domain;

import com.poudy.product.domain.Products;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

public abstract sealed class CurationBlock permits CurationImageBlock, CurationProductsBlock,
    CurationProductsByFilterBlock {

    public enum Status {
        VISIBLE,
        HIDDEN
    }

    private final UUID id;
    private final Status status;
    private final int spacingTop;
    private final int spacingBottom;

    protected CurationBlock(UUID id, Status status, int spacingTop, int spacingBottom) {
        this.id = Objects.requireNonNull(id);
        this.status = Objects.requireNonNull(status);
        if (spacingTop < 0 || spacingBottom < 0) {
            throw new IllegalArgumentException("블록 여백은 음수일 수 없습니다.");
        }
        this.spacingTop = spacingTop;
        this.spacingBottom = spacingBottom;
    }

    public static CurationBlock image(UUID id, Status status, int spacingTop, int spacingBottom, String imageUrl) {
        return new CurationImageBlock(id, status, spacingTop, spacingBottom, imageUrl);
    }

    public static CurationBlock products(
        UUID id,
        Status status,
        int spacingTop,
        int spacingBottom,
        List<Long> productIds
    ) {
        return new CurationProductsBlock(id, status, spacingTop, spacingBottom, productIds);
    }

    public static CurationBlock productsByFilter(
        UUID id,
        Status status,
        int spacingTop,
        int spacingBottom,
        List<CurationFilter> filters,
        List<CurationProductMapping> products
    ) {
        return new CurationProductsByFilterBlock(id, status, spacingTop, spacingBottom, filters, products);
    }

    public UUID id() {
        return id;
    }

    protected final boolean isVisible() {
        return status == Status.VISIBLE;
    }

    protected final int spacingTop() {
        return spacingTop;
    }

    protected final int spacingBottom() {
        return spacingBottom;
    }

    abstract Optional<CurationBlockContent> visibleContent(Products products);

    List<Long> productIds() {
        return List.of();
    }
}
