package com.poudy.ingredient.domain;

import com.poudy.tag.domain.FormulationRole;
import com.poudy.tag.domain.SkinEffect;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Locale;
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

    public boolean matches(String keyword) {
        // spotless:off
        return contains(koreanName, keyword) || contains(englishName, keyword)
                || aliases.stream()
                        .anyMatch(alias -> contains(alias, keyword));
        // spotless:on
    }

    public String lowerCaseEnglishName() {
        return englishName.toLowerCase(Locale.ROOT);
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

    private static boolean contains(String value, String keyword) {
        return value != null && value.toLowerCase(Locale.ROOT).contains(keyword);
    }

    private IngredientTags tags() {
        return new IngredientTags(tagMappings);
    }
}
