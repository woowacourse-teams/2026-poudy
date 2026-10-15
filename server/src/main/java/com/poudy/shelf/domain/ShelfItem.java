package com.poudy.shelf.domain;

import com.poudy.product.domain.Product;
import java.time.OffsetDateTime;

public final class ShelfItem {

    private final ShelfProduct shelfProduct;
    private final Product product;

    public ShelfItem(ShelfProduct shelfProduct, Product product) {
        this.shelfProduct = shelfProduct;
        this.product = product;
    }

    public boolean belongsTo(ShelfTab tab) {
        return shelfProduct.belongsTo(tab);
    }

    public boolean isRatedBad() {
        return shelfProduct.isRatedBad();
    }

    public boolean isRatedGood() {
        return shelfProduct.isRatedGood();
    }

    public boolean isPossiblyUnsuitable() {
        // TODO: 성분 분석 알고리즘이 생기면 분석 결과 성분을 포함하는지로 판단한다. 지금은 임의의 값을 돌려준다.
        return false;
    }

    public Product product() {
        return product;
    }

    public ShelfUsageStatus usageStatus() {
        return shelfProduct.usageStatus();
    }

    public Rating rating() {
        return shelfProduct.rating();
    }

    public OffsetDateTime registeredAt() {
        return shelfProduct.registeredAt();
    }
}
