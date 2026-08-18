package com.poudy.product.domain;

import com.poudy.brand.domain.Brand;
import com.poudy.category.domain.Category;
import com.poudy.ingredient.domain.Ingredient;
import com.poudy.ingredient.domain.Ingredients;
import com.poudy.product.domain.sensory.ProductSensory;
import com.poudy.tag.domain.SkinEffect;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;

public record Product(
        Long id,
        String name,
        Brand brand,
        Category category,
        Ingredients ingredients,
        String imageUrl,
        ProductVariants variants,
        ProductSensory sensory,
        OffsetDateTime updatedAt) {

    public Product {
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("제품 이름이 필요합니다.");
        }
        if (brand == null) {
            throw new IllegalArgumentException("제품은 브랜드를 가져야 합니다.");
        }
        if (category == null) {
            throw new IllegalArgumentException("제품은 카테고리를 가져야 합니다.");
        }
        if (ingredients == null) {
            ingredients = new Ingredients(List.of());
        }
        if (imageUrl == null) {
            imageUrl = "";
        }
        if (variants == null) {
            throw new IllegalArgumentException("제품은 용량 옵션을 가져야 합니다.");
        }
        if (sensory == null) {
            throw new IllegalArgumentException("제품 감각 추론 결과가 필요합니다.");
        }
        if (updatedAt == null) {
            throw new IllegalArgumentException("제품 갱신 시각이 필요합니다.");
        }
    }

    public boolean contains(Long ingredientId) {
        if (ingredientId == null) {
            return false;
        }

        return ingredients.findById(ingredientId).isPresent();
    }

    public boolean matches(ProductFilter filter) {
        return matchesCategory(filter.categoryIds())
                && matchesAny(filter.brandIds(), brand.id())
                && matchesAny(filter.moistureLevels(), sensory.moisture())
                && matchesAny(filter.oilLevels(), sensory.oil())
                && ingredients.containsAll(filter.ingredientFilter().includedIds())
                && !ingredients.containsAny(filter.ingredientFilter().excludedIds());
    }

    public Integer moistureLevel() {
        return sensory.moisture().value();
    }

    public Integer oilLevel() {
        return sensory.oil().value();
    }

    public ProductVariant representativeVariant() {
        return variants.representative();
    }

    public List<SkinEffectGroup> skinEffectGroups() {
        Map<SkinEffect, List<Long>> ingredientIds = new EnumMap<>(SkinEffect.class);
        for (Ingredient ingredient : ingredients.values()) {
            for (SkinEffect effect : ingredient.skinEffects()) {
                ingredientIds.computeIfAbsent(effect, key -> new ArrayList<>()).add(ingredient.id());
            }
        }

        return ingredientIds.entrySet().stream()
                .map(entry -> new SkinEffectGroup(entry.getKey(), entry.getValue()))
                .toList();
    }

    private boolean matchesCategory(List<Long> categoryIds) {
        return categoryIds.isEmpty()
                || categoryIds.contains(category.id())
                || categoryIds.contains(category.parentId());
    }

    private static boolean matchesAny(List<?> candidates, Object value) {
        return candidates.isEmpty() || candidates.contains(value);
    }

}
