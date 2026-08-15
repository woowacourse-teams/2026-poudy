package com.poudy.ingredient.domain;

import com.poudy.tag.domain.FormulationRole;
import com.poudy.tag.domain.SkinEffect;
import com.poudy.tag.domain.TagCategory;
import java.time.OffsetDateTime;
import java.util.List;
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
                .filter(tag -> tag.isOf(TagCategory.BIOLOGICAL_EFFECT))
                .filter(tag -> SkinEffect.from(tag.name()).isPresent())
                .flatMap(tag -> EvidenceSources.parseTag(tag.source()).stream())
                .distinct()
                .toList();
        // spotless:on
    }

    private Stream<String> namesOf(TagCategory category) {
        // spotless:off
        return tagMappings.stream()
                .filter(tag -> tag.isOf(category))
                .map(IngredientTag::name);
        // spotless:on
    }
}
