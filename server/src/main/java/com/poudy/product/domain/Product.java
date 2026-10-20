package com.poudy.product.domain;

import com.poudy.brand.domain.Brand;
import com.poudy.category.domain.Category;
import com.poudy.ingredient.domain.Ingredient;
import com.poudy.product.domain.sensory.ProductSensory;
import com.poudy.search.domain.SearchKeyword;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;

public final class Product {

    private static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");

    private final Long id;
    private final String name;
    private final Brand brand;
    private final Category category;
    private final List<Badge> badges;
    private final List<ProductPart> parts;
    private final String imageUrl;
    private final ProductVariants variants;
    private final ProductSensory sensory;
    private final boolean sensitiveSkin;
    private final LocalDateTime updatedAt;

    public Product(
        Long id,
        String name,
        Brand brand,
        Category category,
        List<Badge> badges,
        List<ProductPart> parts,
        String imageUrl,
        ProductVariants variants,
        ProductSensory sensory,
        boolean sensitiveSkin,
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
        requireLeafCategory(category);
        if (badges == null) {
            throw new IllegalArgumentException("제품 배지 목록이 필요합니다.");
        }
        if (parts == null) {
            parts = List.of();
        }
        if (variants == null) {
            throw new IllegalArgumentException("제품은 용량 옵션을 가져야 합니다.");
        }
        if (sensory == null) {
            throw new IllegalArgumentException("제품 수분감·유분감 단계가 필요합니다.");
        }
        if (updatedAt == null) {
            throw new IllegalArgumentException("제품 갱신 시각이 필요합니다.");
        }

        this.id = id;
        this.name = name;
        this.brand = brand;
        this.category = category;
        this.badges = List.copyOf(badges);
        this.parts = List.copyOf(parts);
        this.imageUrl = imageUrl;
        this.variants = variants;
        this.sensory = sensory;
        this.sensitiveSkin = sensitiveSkin;
        this.updatedAt = updatedAt.atZoneSameInstant(SEOUL).toLocalDateTime();
    }

    private static void requireLeafCategory(Category category) {
        if (category.isParent()) {
            throw new IllegalArgumentException("제품은 소분류 카테고리를 가져야 합니다.");
        }
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

    public List<Badge> badges() {
        return badges;
    }

    public List<ProductPart> parts() {
        return parts;
    }

    public List<Ingredient> ingredients() {
        Map<Long, Ingredient> ingredientsById = new LinkedHashMap<>();
        parts.forEach(
            part -> part.ingredients().values()
                .forEach(ingredient -> ingredientsById.putIfAbsent(ingredient.id(), ingredient))
        );
        return List.copyOf(ingredientsById.values());
    }

    public boolean containsIngredient(Long ingredientId) {
        return parts.stream().anyMatch(part -> part.ingredients().contains(ingredientId));
    }

    public int ingredientPosition(Long ingredientId) {
        List<Ingredient> combinedIngredients = ingredients();
        for (int position = 0; position < combinedIngredients.size(); position++) {
            if (combinedIngredients.get(position).hasId(ingredientId)) {
                return position;
            }
        }
        return -1;
    }

    public Optional<ProductPart> firstPart() {
        return parts.stream().findFirst();
    }

    public Optional<ProductPart> findPart(Long partId) {
        return parts.stream().filter(part -> part.hasId(partId)).findFirst();
    }

    public String imageUrl() {
        return Objects.requireNonNullElse(imageUrl, "");
    }

    public ProductVariants variants() {
        return variants;
    }

    public OffsetDateTime updatedAt() {
        return updatedAt.atZone(SEOUL).toOffsetDateTime();
    }

    public boolean isDiscontinued() {
        return variants.allDiscontinued();
    }

    public boolean belongsToCategory(Long categoryId) {
        return category.belongsTo(categoryId);
    }

    public boolean matchesNameExactly(SearchKeyword keyword) {
        return keyword.matchesExactly(name);
    }

    public boolean supportsSensory() {
        return sensory.isAvailable();
    }

    public Double moistureLevel() {
        return sensory.moistureLevel();
    }

    public Double oilLevel() {
        return sensory.oilLevel();
    }

    public boolean isForSensitiveSkin() {
        return sensitiveSkin;
    }

    public ProductVariant representativeVariant() {
        return variants.representative();
    }

    public long priceDifferenceFrom(Product base) {
        return variants.priceDifferenceFrom(base.variants);
    }
}
