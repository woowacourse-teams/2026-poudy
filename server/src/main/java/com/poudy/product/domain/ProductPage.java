package com.poudy.product.domain;

import com.poudy.brand.domain.Brand;
import java.util.List;

public record ProductPage(List<Product> items, long totalElements, List<Brand> brands) {

    public ProductPage {
        items = List.copyOf(items);
        brands = List.copyOf(brands);
    }
}
