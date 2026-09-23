package com.poudy.ingredient.domain;

import com.poudy.tag.domain.FormulationRole;
import com.poudy.tag.domain.SkinEffect;
import com.poudy.tag.domain.TagCategory;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Objects;

public final class Ingredient {

    private static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");

    private final Long id;
    private final String koreanName;
    private final String englishName;
    private final String description;
    private final LocalDateTime updatedAt;
    private final List<String> aliases;
    private final List<String> infoSources;
    private final List<IngredientTag> tags;

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
        this.englishName = englishName;
        this.description = description;
        this.updatedAt = local(updatedAt);
        this.aliases = List.copyOf(Objects.requireNonNullElse(aliases, List.of()));
        this.infoSources = List.copyOf(Objects.requireNonNullElse(infoSources, List.of()));
        this.tags = List.copyOf(Objects.requireNonNullElse(tagMappings, List.of()));
    }

    private static LocalDateTime local(OffsetDateTime value) {
        if (value == null) {
            return null;
        }
        return value.atZoneSameInstant(SEOUL).toLocalDateTime();
    }

    public Long id() {
        return id;
    }

    public String koreanName() {
        return koreanName;
    }

    public String englishName() {
        return Objects.requireNonNullElse(englishName, "");
    }

    public String description() {
        return description;
    }

    public OffsetDateTime updatedAt() {
        if (updatedAt == null) {
            return null;
        }
        return updatedAt.atZone(SEOUL).toOffsetDateTime();
    }

    public boolean hasId(Long ingredientId) {
        return Objects.equals(id, ingredientId);
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

    public List<String> aliases() {
        return aliases;
    }

    public List<String> effectSources() {
        return tags.stream()
            .filter(IngredientTag::isDisplayedSkinEffect)
            .flatMap(tag -> tag.sources().stream())
            .distinct()
            .toList();
    }
}
