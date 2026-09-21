package com.poudy.ingredient.domain;

import com.poudy.tag.domain.FormulationRole;
import com.poudy.tag.domain.SkinEffect;
import com.poudy.tag.domain.TagCategory;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Objects;

public final class Ingredient {

    private final Long id;
    private final String koreanName;
    private final String englishName;
    private final String description;
    private final List<String> infoSources;
    private final List<IngredientTag> tags;
    private final List<String> aliases;
    private final OffsetDateTime updatedAt;

    public Ingredient(
        Long id,
        String koreanName,
        String englishName,
        String description,
        List<String> infoSources,
        List<String> aliases,
        List<IngredientTag> tagMappings,
        OffsetDateTime updatedAt
    ) {
        this.id = id;
        this.koreanName = koreanName;
        this.englishName = Objects.requireNonNullElse(englishName, "");
        this.description = description;
        this.infoSources = List.copyOf(Objects.requireNonNullElse(infoSources, List.<String>of()));
        this.aliases = List.copyOf(Objects.requireNonNullElse(aliases, List.of()));
        this.tags = List.copyOf(Objects.requireNonNullElse(tagMappings, List.of()));
        this.updatedAt = updatedAt;

    }

    public List<String> aliases() {
        return aliases;
    }

    public Long id() {
        return id;
    }

    public String koreanName() {
        return koreanName;
    }

    public String englishName() {
        return englishName;
    }

    public String description() {
        return description;
    }

    public OffsetDateTime updatedAt() {
        return updatedAt;
    }

    public boolean hasKoreanName(String candidate) {
        return candidate.equals(koreanName);
    }

    public boolean hasId(Long ingredientId) {
        return Objects.equals(id, ingredientId);
    }

    public boolean hasEnglishName(String candidate) {
        return candidate.equalsIgnoreCase(englishName);
    }

    public List<FormulationRole> formulationRoles() {
        return tags.stream()
            .filter(tag -> tag.isOf(TagCategory.FUNCTION))
            .map(IngredientTag::formulationRole)
            .toList();
    }

    public List<SkinEffect> skinEffects() {
        return tags.stream()
            .filter(tag -> tag.isOf(TagCategory.BIOLOGICAL_EFFECT))
            .map(IngredientTag::skinEffect)
            .toList();
    }

    public List<String> infoSources() {
        return infoSources;
    }

    public List<String> effectSources() {
        return tags.stream()
            .filter(IngredientTag::isDisplayedSkinEffect)
            .flatMap(tag -> tag.sources().stream())
            .distinct()
            .toList();
    }

}
