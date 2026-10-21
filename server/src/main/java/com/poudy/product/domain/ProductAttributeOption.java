package com.poudy.product.domain;

import java.util.List;

public record ProductAttributeOption(String attributeCode, String name, List<Value> values) {
    public ProductAttributeOption {
        values = List.copyOf(values);
    }

    public record Value(String valueCode, String name, long productCount) {
    }
}
