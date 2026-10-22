package com.poudy.shelf.domain;

import com.poudy.product.domain.Product;
import java.time.OffsetDateTime;

public final class ShelfItem {

    private final ShelfProduct shelfProduct;
    private final Product product;
    private final boolean possiblyUnsuitable;

    public ShelfItem(ShelfProduct shelfProduct, Product product, boolean possiblyUnsuitable) {
        this.shelfProduct = shelfProduct;
        this.product = product;
        this.possiblyUnsuitable = possiblyUnsuitable;
    }

    public boolean belongsTo(ShelfTab tab) {
        return shelfProduct.belongsTo(tab);
    }

    public boolean isRatedBad() {
        return shelfProduct.isRatedBad();
    }

    public boolean isPossiblyUnsuitable() {
        return possiblyUnsuitable;
    }

    public boolean holds(long productId) {
        return shelfProduct.productId() == productId;
    }

    public Product product() {
        return product;
    }

    public ShelfUsageStatus usageStatus() {
        return shelfProduct.usageStatus();
    }

    public Rating rating() {
        return shelfProduct.ratingFor(product);
    }

    public OffsetDateTime registeredAt() {
        return shelfProduct.registeredAt();
    }
}
