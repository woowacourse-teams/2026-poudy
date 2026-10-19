package com.poudy.product.search.domain.query;

public final class BrandProductSplit {
    private final SearchToken brand;
    private final SearchToken product;

    public BrandProductSplit(SearchToken brand, SearchToken product) {
        this.brand = brand;
        this.product = product;
    }

    public SearchToken brand() {
        return brand;
    }

    public SearchToken product() {
        return product;
    }
}
