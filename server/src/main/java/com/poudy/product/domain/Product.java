package com.poudy.product.domain;

import com.poudy.brand.domain.Brand;
import com.poudy.category.domain.Category;
import com.poudy.ingredient.domain.Ingredient;
import com.poudy.ingredient.domain.Ingredients;
import com.poudy.product.domain.sensory.ProductSensory;
import com.poudy.search.domain.NameRank;
import com.poudy.search.domain.SearchKeyword;
import com.poudy.search.domain.TextMatch;
import com.poudy.tag.domain.SkinEffect;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

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

    private static final int MAIN_SKIN_EFFECT_GROUP_LIMIT = 3;

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
        if (category.isParent()) {
            throw new IllegalArgumentException("제품은 소분류 카테고리를 가져야 합니다.");
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

        return ingredients.contains(ingredientId);
    }

    public boolean hasBrand(Brand other) {
        return brand.equals(other);
    }

    public boolean hasBrandId(Long brandId) {
        return brand.hasId(brandId);
    }

    public NameRank matchBrandKeyword(SearchKeyword keyword) {
        return brand.matchKeyword(keyword);
    }

    public Optional<TextMatch> findBrandMatch(SearchKeyword keyword) {
        return brand.findMatch(keyword);
    }

    public boolean matchesNameExactly(SearchKeyword keyword) {
        return keyword.matchesExactly(name);
    }

    public boolean matches(ProductFilter filter) {
        return matchesCategory(filter.categoryIds())
            && matchesBrand(filter.brandIds())
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
        Map<Long, SkinEffectGroupAccumulator> groups = new HashMap<>();
        for (Ingredient ingredient : ingredients.values()) {
            for (SkinEffect effect : ingredient.skinEffects()) {
                SkinEffectGroupAccumulator group = groups.computeIfAbsent(
                    effect.id(),
                    ignored -> new SkinEffectGroupAccumulator(effect)
                );
                group.add(ingredient.id());
            }
        }

        return groups.values().stream()
            .map(SkinEffectGroupAccumulator::toGroup)
            .sorted(
                Comparator.comparingInt((SkinEffectGroup group) -> group.ingredientIds().size())
                    .reversed()
                    .thenComparing(group -> group.effect().id())
            )
            .limit(MAIN_SKIN_EFFECT_GROUP_LIMIT)
            .toList();
    }

    private static class SkinEffectGroupAccumulator {

        private final SkinEffect effect;
        private final List<Long> ingredientIds = new ArrayList<>();

        private SkinEffectGroupAccumulator(SkinEffect effect) {
            this.effect = effect;
        }

        private void add(Long ingredientId) {
            ingredientIds.add(ingredientId);
        }

        private SkinEffectGroup toGroup() {
            return new SkinEffectGroup(effect, ingredientIds);
        }
    }

    private boolean matchesCategory(List<Long> categoryIds) {
        return categoryIds.isEmpty()
            || categoryIds.contains(category.id())
            || categoryIds.contains(category.parentId());
    }

    private boolean matchesBrand(List<Long> brandIds) {
        return brandIds.isEmpty() || brandIds.stream().anyMatch(brand::hasId);
    }

    private static boolean matchesAny(List<?> candidates, Object value) {
        return candidates.isEmpty() || candidates.contains(value);
    }

}
