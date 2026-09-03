package com.poudy.product.domain;

import com.poudy.brand.domain.Brand;
import com.poudy.category.domain.Category;
import com.poudy.ingredient.domain.Ingredient;
import com.poudy.ingredient.domain.Ingredients;
import com.poudy.product.domain.sensory.MoistureLevel;
import com.poudy.product.domain.sensory.OilLevel;
import com.poudy.product.domain.sensory.ProductSensory;
import com.poudy.product.domain.sensory.SensoryModelVersion;
import com.poudy.search.domain.NameMatch;
import com.poudy.search.domain.SearchKeyword;
import com.poudy.search.domain.SearchableText;
import com.poudy.search.domain.TextMatch;
import com.poudy.tag.domain.SkinEffect;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

public final class Product {

    private static final int MAIN_SKIN_EFFECT_GROUP_LIMIT = 3;

    private final Long id;
    private final String name;
    private final Brand brand;
    private final Category category;
    private final Ingredients ingredients;
    private final String imageUrl;
    private final ProductVariants variants;
    private final ProductSensory sensory;
    private final OffsetDateTime updatedAt;
    private final List<SearchableText> searchableNames;

    public Product(
        Long id,
        String name,
        Brand brand,
        Category category,
        Ingredients ingredients,
        String imageUrl,
        ProductVariants variants,
        ProductSensory sensory,
        OffsetDateTime updatedAt
    ) {
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

        this.id = id;
        this.name = name;
        this.brand = brand;
        this.category = category;
        this.ingredients = ingredients;
        this.imageUrl = imageUrl;
        this.variants = variants;
        this.sensory = sensory;
        this.updatedAt = updatedAt;
        this.searchableNames = SearchableText.formsOf(name);
    }

    public Long id() {
        return id;
    }

    public String name() {
        return name;
    }

    public Brand brand() {
        return brand;
    }

    public Category category() {
        return category;
    }

    public Ingredients ingredients() {
        return ingredients;
    }

    public String imageUrl() {
        return imageUrl;
    }

    public ProductVariants variants() {
        return variants;
    }

    public OffsetDateTime updatedAt() {
        return updatedAt;
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

    public boolean belongsToCategory(Long categoryId) {
        return category.belongsTo(categoryId);
    }

    public boolean matchesNameExactly(SearchKeyword keyword) {
        return keyword.matchesExactly(name);
    }

    public boolean usesSensoryModelVersion(SensoryModelVersion modelVersion) {
        return sensory.usesModelVersion(modelVersion);
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

    public Optional<MatchedProduct> match(ProductSearchQuery query) {
        Optional<MatchedProduct> direct = matchDirectly(query.whole());
        if (direct.isPresent()) {
            return direct;
        }

        return query.parts().stream()
            .map(this::matchCombined)
            .flatMap(Optional::stream)
            .min(CombinedMatch.ORDER)
            .map(match -> MatchedProduct.combined(this, match.brand(), match.product()));
    }

    public Optional<MatchedProduct> matchByProductName(SearchKeyword keyword) {
        return findProductNameMatch(keyword)
            .map(match -> new MatchedProduct(this, ProductMatchField.PRODUCT_NAME, match));
    }

    private Optional<MatchedProduct> matchDirectly(SearchKeyword keyword) {
        Optional<TextMatch> productNameMatch = findProductNameMatch(keyword);
        Optional<TextMatch> brandNameMatch = brand.findMatch(keyword);

        if (isBetterThan(brandNameMatch, productNameMatch)) {
            return brandNameMatch.map(match -> new MatchedProduct(this, ProductMatchField.BRAND_NAME, match));
        }
        return productNameMatch.map(match -> new MatchedProduct(this, ProductMatchField.PRODUCT_NAME, match));
    }

    private Optional<CombinedMatch> matchCombined(ProductSearchQuery.Parts parts) {
        Optional<TextMatch> brandMatch = brand.findMatch(parts.brand());
        if (brandMatch.isEmpty() || !matchesBrandPrefix(brandMatch.get())) {
            return Optional.empty();
        }

        return findProductNameMatch(parts.product())
            .map(productMatch -> new CombinedMatch(brandMatch.get(), productMatch));
    }

    private Optional<TextMatch> findProductNameMatch(SearchKeyword keyword) {
        return TextMatch.best(searchableNames, keyword);
    }

    private static boolean matchesBrandPrefix(TextMatch match) {
        return match.rank().match() == NameMatch.EXACT || match.rank().match() == NameMatch.PREFIX;
    }

    private static boolean isBetterThan(Optional<TextMatch> candidate, Optional<TextMatch> current) {
        if (candidate.isEmpty()) {
            return false;
        }
        return current.isEmpty() || candidate.get().rank().isBetterThan(current.get().rank());
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

    private record CombinedMatch(TextMatch brand, TextMatch product) {

        private static final Comparator<CombinedMatch> ORDER = Comparator
            .comparing((CombinedMatch match) -> match.brand().rank())
            .thenComparing(match -> match.product().rank());
    }

    public boolean belongsToAnyCategory(List<Long> categoryIds) {
        return categoryIds.isEmpty() || categoryIds.stream().anyMatch(this::belongsToCategory);
    }

    public boolean belongsToAnyBrand(List<Long> brandIds) {
        return brandIds.isEmpty() || brandIds.stream().anyMatch(brand::hasId);
    }

    public boolean hasAnyMoistureLevel(List<MoistureLevel> levels) {
        return levels.isEmpty() || levels.contains(sensory.moisture());
    }

    public boolean hasAnyOilLevel(List<OilLevel> levels) {
        return levels.isEmpty() || levels.contains(sensory.oil());
    }

    public boolean matchesIngredients(IngredientFilter filter) {
        return filter.matches(ingredients);
    }
}
