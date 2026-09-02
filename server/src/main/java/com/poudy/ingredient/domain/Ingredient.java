package com.poudy.ingredient.domain;

import com.poudy.tag.domain.FormulationRole;
import com.poudy.tag.domain.SkinEffect;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Objects;

public record Ingredient(
    Long id,
    String koreanName,
    String englishName,
    String originDefinition,
    String description,
    String descriptionEvidence,
    List<String> aliases,
    List<IngredientTag> tagMappings,
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt) {

    public Ingredient {
        englishName = Objects.requireNonNullElse(englishName, "");
        originDefinition = Objects.requireNonNullElse(originDefinition, "");
        descriptionEvidence = Objects.requireNonNullElse(descriptionEvidence, "");
        aliases = List.copyOf(Objects.requireNonNullElse(aliases, List.of()));
        tagMappings = List.copyOf(Objects.requireNonNullElse(tagMappings, List.of()));
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
        return tags().formulationRoles();
    }

    public List<SkinEffect> skinEffects() {
        return tags().skinEffects();
    }

    public List<String> infoSources() {
        return Evidence.ofDescription(descriptionEvidence).sources();
    }

    public List<String> effectSources() {
        return tags().effectSources();
    }

    private IngredientTags tags() {
        return new IngredientTags(tagMappings);
    }
}
