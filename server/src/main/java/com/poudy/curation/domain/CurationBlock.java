package com.poudy.curation.domain;

import com.poudy.product.domain.Products;
import jakarta.persistence.Column;
import jakarta.persistence.DiscriminatorColumn;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Inheritance;
import jakarta.persistence.InheritanceType;
import jakarta.persistence.Table;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

@Entity
@Table(name = "curation_block")
@Inheritance(strategy = InheritanceType.SINGLE_TABLE)
@DiscriminatorColumn(name = "type")
public abstract class CurationBlock {

    @Id
    private UUID id;

    @Column(name = "position")
    private Integer position;

    @Column(name = "spacing_top")
    private int spacingTop;

    @Column(name = "spacing_bottom")
    private int spacingBottom;

    protected CurationBlock() {
    }

    protected CurationBlock(UUID id, int spacingTop, int spacingBottom) {
        this.id = id;
        this.spacingTop = spacingTop;
        this.spacingBottom = spacingBottom;
        validateBlock();
    }

    protected final void validateBlock() {
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
