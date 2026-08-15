package com.poudy.ingredient.domain;

import com.poudy.tag.domain.FormulationRole;
import com.poudy.tag.domain.SkinEffect;
import com.poudy.tag.domain.TagCategory;
import java.time.OffsetDateTime;
import java.util.List;
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
        englishName = englishName == null ? "" : englishName;
        originDefinition = originDefinition == null ? "" : originDefinition;
        descriptionEvidence = descriptionEvidence == null ? "" : descriptionEvidence;
        aliases = aliases == null ? List.of() : List.copyOf(aliases);
        tagMappings = tagMappings == null ? List.of() : List.copyOf(tagMappings);
    }

    public List<IngredientTag> tagsOf(TagCategory category) {
        return tagMappings.stream().filter(tag -> tag.isOf(category)).toList();
    }

    public List<FormulationRole> formulationRoles() {
        return namesOf(TagCategory.FUNCTION).map(FormulationRole::from).flatMap(Optional::stream).toList();
    }

    public List<SkinEffect> skinEffects() {
        return namesOf(TagCategory.BIOLOGICAL_EFFECT).map(SkinEffect::from).flatMap(Optional::stream).toList();
    }

    public List<String> infoSources() {
        return EvidenceSources.parse(descriptionEvidence);
    }

    public List<String> effectSources() {
        return tagMappings.stream().filter(tag -> tag.isOf(TagCategory.BIOLOGICAL_EFFECT))
                .filter(tag -> SkinEffect.from(tag.name()).isPresent())
                .flatMap(tag -> EvidenceSources.parse(tag.source()).stream()).distinct().toList();
    }

    private Stream<String> namesOf(TagCategory category) {
        return tagMappings.stream().filter(tag -> tag.isOf(category)).map(IngredientTag::name);
    }
}
