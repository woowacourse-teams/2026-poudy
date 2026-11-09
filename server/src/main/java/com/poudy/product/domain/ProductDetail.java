package com.poudy.product.domain;

import com.poudy.category.domain.Categories;
import com.poudy.category.domain.Category;
import com.poudy.excludecode.domain.ExcludeCodeGroup;
import com.poudy.excludecode.domain.ExcludeCodes;
import com.poudy.ingredientgroup.domain.IngredientGroupCatalog;
import java.util.List;
import java.util.Objects;

public final class ProductDetail {

    private final Product product;
    private final ProductPart selectedPart;
    private final List<Category> categoryPath;
    private final List<ExcludeCodeGroup> excludeCodes;
    private final IngredientGroupCatalog ingredientGroups;
    private final List<ProductYouTubeRecommendation> youtubeRecommendations;

    private ProductDetail(
        Product product,
        ProductPart selectedPart,
        List<Category> categoryPath,
        List<ExcludeCodeGroup> excludeCodes,
        IngredientGroupCatalog ingredientGroups,
        List<ProductYouTubeRecommendation> youtubeRecommendations
    ) {
        this.product = product;
        this.selectedPart = selectedPart;
        this.categoryPath = categoryPath;
        this.excludeCodes = excludeCodes;
        this.ingredientGroups = ingredientGroups;
        this.youtubeRecommendations = youtubeRecommendations;
    }

    public static ProductDetail from(
        Product product,
        ProductPart selectedPart,
        Categories categories,
        ExcludeCodes excludeCodeIngredients,
        IngredientGroupCatalog ingredientGroups,
        List<ProductYouTubeRecommendation> youtubeRecommendations
    ) {
        Objects.requireNonNull(product, "상세 조회할 제품이 필요합니다.");
        Objects.requireNonNull(categories, "카테고리 목록이 필요합니다.");
        Objects.requireNonNull(excludeCodeIngredients, "제외 성분군 목록이 필요합니다.");
        Objects.requireNonNull(ingredientGroups, "성분군 목록이 필요합니다.");

        List<Category> categoryPath = categories.pathOf(product.category());
        List<ExcludeCodeGroup> excludeCodes = excludeCodeIngredients.groups();
        List<ProductYouTubeRecommendation> recommendations = List.copyOf(youtubeRecommendations);

        return new ProductDetail(
            product,
            selectedPart,
            categoryPath,
            excludeCodes,
            ingredientGroups,
            recommendations
        );
    }

    public Product product() {
        return product;
    }

    public ProductPart selectedPart() {
        return selectedPart;
    }

    public List<Category> categoryPath() {
        return categoryPath;
    }

    public List<ExcludeCodeGroup> excludeCodes() {
        return excludeCodes;
    }

    public IngredientGroupCatalog ingredientGroups() {
        return ingredientGroups;
    }

    public List<ProductYouTubeRecommendation> youtubeRecommendations() {
        return youtubeRecommendations;
    }

    public long cautionCountOf(ProductPart part) {
        return part.countContainedFrom(excludeCodes);
    }

    public List<ExcludeCodeGroup> cautionGroupsOf(Long ingredientId) {
        return excludeCodes.stream()
            .filter(group -> group.containsIngredient(ingredientId))
            .toList();
    }
}
