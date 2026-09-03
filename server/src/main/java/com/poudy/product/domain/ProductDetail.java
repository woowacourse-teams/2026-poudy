package com.poudy.product.domain;

import com.poudy.category.domain.Categories;
import com.poudy.category.domain.Category;
import com.poudy.excludecode.domain.ExcludeCode;
import com.poudy.excludecode.domain.ExcludeCodeIngredients;
import java.util.List;
import java.util.Objects;

public record ProductDetail(Product product, List<Category> categoryPath, List<ExcludeCode> freeOfCodes) {

    public ProductDetail {
        categoryPath = List.copyOf(categoryPath);
        freeOfCodes = List.copyOf(freeOfCodes);
    }

    public static ProductDetail from(
        Product product,
        Categories categories,
        ExcludeCodeIngredients excludeCodeIngredients
    ) {
        Objects.requireNonNull(product, "상세 조회할 제품이 필요합니다.");
        Objects.requireNonNull(categories, "카테고리 목록이 필요합니다.");
        Objects.requireNonNull(excludeCodeIngredients, "제외 성분군 목록이 필요합니다.");

        return new ProductDetail(
            product,
            categories.pathOf(product.category()),
            excludeCodeIngredients.freeCodesOf(product.ingredients())
        );
    }
}
