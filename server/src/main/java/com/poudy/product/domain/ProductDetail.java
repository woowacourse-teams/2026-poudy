package com.poudy.product.domain;

import com.poudy.category.domain.Category;
import com.poudy.excludecode.domain.ExcludeCode;
import java.util.List;

public record ProductDetail(Product product, List<Category> categoryPath, List<ExcludeCode> freeOfCodes) {

    public ProductDetail {
        categoryPath = List.copyOf(categoryPath);
        freeOfCodes = List.copyOf(freeOfCodes);
    }
}
