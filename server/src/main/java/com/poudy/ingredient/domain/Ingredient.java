package com.poudy.ingredient.domain;

import com.poudy.tag.domain.FormulationRole;
import com.poudy.tag.domain.SkinEffect;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Objects;

public final class Ingredient {

    private final Long id;
    private final String koreanName;
    private final String englishName;
    private final String originDefinition;
    private final String description;
    private final String descriptionEvidence;
    private final List<String> aliases;
    private final IngredientTags tags;
    private final OffsetDateTime createdAt;
    private final OffsetDateTime updatedAt;

    public Ingredient(
        Long id,
        String koreanName,
        String englishName,
        String originDefinition,
        String description,
        String descriptionEvidence,
        List<String> aliases,
        List<IngredientTag> tagMappings,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
    ) {
        this.id = id;
        this.koreanName = koreanName;
        this.englishName = Objects.requireNonNullElse(englishName, "");
        this.originDefinition = Objects.requireNonNullElse(originDefinition, "");
        this.description = description;
        this.descriptionEvidence = Objects.requireNonNullElse(descriptionEvidence, "");
        this.aliases = List.copyOf(Objects.requireNonNullElse(aliases, List.of()));
        this.tags = IngredientTags.from(tagMappings);
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
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

    String originDefinition() {
        return originDefinition;
    }

    public String description() {
        return description;
    }

    String descriptionEvidence() {
        return descriptionEvidence;
    }

    List<String> aliases() {
        return aliases;
    }

    List<IngredientTag> tagMappings() {
        return tags.values();
    }

    OffsetDateTime createdAt() {
        return createdAt;
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
        return tags.formulationRoles();
    }

    public List<SkinEffect> skinEffects() {
        return tags.skinEffects();
    }

    public List<String> infoSources() {
        return Evidence.ofDescription(descriptionEvidence).sources();
    }

    public List<String> effectSources() {
        return tags.effectSources();
    }
}
