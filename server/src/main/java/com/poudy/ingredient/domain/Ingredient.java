package com.poudy.ingredient.domain;

import com.poudy.tag.domain.FormulationRole;
import com.poudy.tag.domain.SkinEffect;
import com.poudy.tag.domain.TagCategory;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Stream;

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
        // spotless:off
        return namesOf(TagCategory.FUNCTION)
                .map(FormulationRole::from)
                .flatMap(Optional::stream)
                .toList();
        // spotless:on
    }

    public List<SkinEffect> skinEffects() {
        // spotless:off
        return namesOf(TagCategory.BIOLOGICAL_EFFECT)
                .map(SkinEffect::from)
                .flatMap(Optional::stream)
                .toList();
        // spotless:on
    }

    public List<String> infoSources() {
        return EvidenceSources.parseDescription(descriptionEvidence);
    }

    public List<String> effectSources() {
        // spotless:off
        return tagMappings.stream()
                .filter(IngredientTag::isDisplayedSkinEffect)
                .flatMap(tag -> EvidenceSources.parseTag(tag.source()).stream())
                .distinct()
                .toList();
        // spotless:on
    }

    private static boolean contains(String value, String keyword) {
        return value != null && value.toLowerCase(Locale.ROOT).contains(keyword);
    }

    private Stream<String> namesOf(TagCategory category) {
        // spotless:off
        return tagMappings.stream()
                .filter(tag -> tag.isOf(category))
                .map(IngredientTag::name);
        // spotless:on
    }
}
