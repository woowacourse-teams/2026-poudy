package com.poudy.product.domain;

import com.poudy.category.domain.Categories;
import com.poudy.category.domain.Category;
import com.poudy.excludecode.domain.ExcludeCodeGroup;
import com.poudy.excludecode.domain.ExcludeCodes;
import com.poudy.ingredientgroup.domain.IngredientGroupCatalog;
import java.util.List;
import java.util.Objects;

public record ProductDetail(
    Product product,
    ProductPart selectedPart,
    List<Category> categoryPath,
    List<ExcludeCodeGroup> excludeCodes,
    IngredientGroupCatalog ingredientGroups) {

    public ProductDetail {
        categoryPath = List.copyOf(categoryPath);
        excludeCodes = List.copyOf(excludeCodes);
    }

    public static ProductDetail from(
        Product product,
        ProductPart selectedPart,
        Categories categories,
        ExcludeCodes excludeCodeIngredients,
        IngredientGroupCatalog ingredientGroups
    ) {
        Objects.requireNonNull(product, "상세 조회할 제품이 필요합니다.");
        Objects.requireNonNull(categories, "카테고리 목록이 필요합니다.");
        Objects.requireNonNull(excludeCodeIngredients, "제외 성분군 목록이 필요합니다.");
        Objects.requireNonNull(ingredientGroups, "성분군 목록이 필요합니다.");

        return new ProductDetail(
            product,
            selectedPart,
            categories.pathOf(product.category()),
            excludeCodeIngredients.groups(),
            ingredientGroups
        );
    }

    public long cautionCountOf(ProductPart part) {
        return part.countContainedFrom(excludeCodes);
    }
}
