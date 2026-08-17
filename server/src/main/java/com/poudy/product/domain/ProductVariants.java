package com.poudy.product.domain;

import java.util.List;

public class ProductVariants {

    private final List<ProductVariant> values;

    public ProductVariants(List<ProductVariant> values) {
        if (values == null || values.isEmpty()) {
            throw new IllegalArgumentException("제품은 하나 이상의 용량 옵션을 가져야 합니다.");
        }
        this.values = List.copyOf(values);
    }

    public ProductVariant representative() {
        return values.getFirst();
    }

    public List<ProductVariant> values() {
        return values;
    }
}
