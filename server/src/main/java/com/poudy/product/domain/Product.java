package com.poudy.product.domain;

import com.poudy.brand.domain.Brand;
import com.poudy.category.domain.Category;
import com.poudy.ingredient.domain.Ingredient;
import com.poudy.ingredient.domain.Ingredients;
import com.poudy.product.domain.sensory.MoistureLevel;
import com.poudy.product.domain.sensory.OilLevel;
import com.poudy.product.domain.sensory.ProductSensory;
import com.poudy.search.domain.SearchKeyword;
import com.poudy.skintype.domain.SkinType;
import com.poudy.tag.domain.SkinEffect;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.PostLoad;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

@Entity
@Table(name = "product")
public class Product {

    private static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");

    private static final int MAIN_SKIN_EFFECT_GROUP_LIMIT = 3;

    @Id
    private Long id;

    @Column(name = "product_name")
    private String name;

    @ManyToOne
    @JoinColumn(name = "brand_id")
    private Brand brand;

    @ManyToOne
    @JoinColumn(name = "category_id")
    private Category category;

    @Column(name = "image_url")
    private String imageUrl;

    @Column(name = "moisture_level")
    private Short moistureLevel;

    @Column(name = "oil_level")
    private Short oilLevel;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @ElementCollection
    @CollectionTable(name = "product_skin_type", joinColumns = @JoinColumn(name = "product_id"))
    @Enumerated(EnumType.STRING)
    @Column(name = "skin_type_code")
    private Set<SkinType> skinTypeRows;

    @OneToMany
    @JoinColumn(name = "product_id")
    @OrderBy("displayOrder")
    private List<ProductComponent> components;

    @OneToMany
    @JoinColumn(name = "product_id")
    @OrderBy("displayOrder")
    private List<ProductVariant> variantRows;

    @Transient
    private Set<SkinType> skinTypes;

    @Transient
    private Ingredients ingredients;

    @Transient
    private ProductVariants variants;

    @Transient
    private ProductSensory sensory;

    protected Product() {
    }

    public Product(
        Long id,
        String name,
        Brand brand,
        Category category,
        Ingredients ingredients,
        String imageUrl,
        ProductVariants variants,
        ProductSensory sensory,
        OffsetDateTime updatedAt,
        Set<SkinType> skinTypes
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
        if (ingredients == null) {
            ingredients = new Ingredients(List.of());
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

        this.skinTypes = Set.copyOf(skinTypes);
        this.skinTypeRows = this.skinTypes;
        this.id = id;
        this.name = name;
        this.brand = brand;
        this.category = category;
        this.ingredients = ingredients;
        this.imageUrl = imageUrl;
        this.variants = variants;
        this.sensory = sensory;
        this.moistureLevel = (short) sensory.moisture().value();
        this.oilLevel = (short) sensory.oil().value();
        this.updatedAt = updatedAt.atZoneSameInstant(SEOUL).toLocalDateTime();
        this.components = List.of();
        this.variantRows = variants.values();
    }

    @PostLoad
    private void load() {
        requireLeafCategory(category);
        this.skinTypes = Set.copyOf(skinTypeRows);
        this.ingredients = new Ingredients(
            components.stream().flatMap(component -> component.ingredients().stream()).toList()
        );
        this.variants = new ProductVariants(variantRows);
        this.sensory = new ProductSensory(new MoistureLevel(moistureLevel), new OilLevel(oilLevel));
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

    public Ingredients ingredients() {
        return ingredients;
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

    public List<Long> ingredientIds() {
        return ingredients.ids();
    }

    public boolean contains(Long ingredientId) {
        if (ingredientId == null) {
            return false;
        }

        return ingredients.contains(ingredientId);
    }

    public boolean isDiscontinued() {
        return variants.allDiscontinued();
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

    public Integer moistureLevel() {
        return sensory.moisture().value();
    }

    public Integer oilLevel() {
        return sensory.oil().value();
    }

    public Set<SkinType> getSkinTypes() {
        return Set.copyOf(skinTypes);
    }

    public ProductVariant representativeVariant() {
        return variants.representative();
    }

    public List<SkinEffectGroup> skinEffectGroups() {
        Map<String, SkinEffectGroupAccumulator> groups = new HashMap<>();
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

    public boolean matchesSkinType(SkinType skinType) {
        return skinType == null || skinTypes.contains(skinType);
    }

}
