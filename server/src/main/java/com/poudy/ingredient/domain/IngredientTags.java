package com.poudy.ingredient.domain;

import com.poudy.tag.domain.FormulationRole;
import com.poudy.tag.domain.SkinEffect;
import com.poudy.tag.domain.TagCategory;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Stream;

public record IngredientTags(List<IngredientTag> values) {

    public IngredientTags {
        values = List.copyOf(Objects.requireNonNullElse(values, List.of()));
    }

    public List<FormulationRole> formulationRoles() {
        return namesOf(TagCategory.FUNCTION)
                .map(FormulationRole::from)
                .flatMap(Optional::stream)
                .toList();
    }

    public List<SkinEffect> skinEffects() {
        return namesOf(TagCategory.BIOLOGICAL_EFFECT)
                .map(SkinEffect::from)
                .flatMap(Optional::stream)
                .toList();
    }

    public List<String> effectSources() {
        return values.stream()
                .filter(IngredientTag::isDisplayedSkinEffect)
                .flatMap(tag -> tag.sources().stream())
                .distinct()
                .toList();
    }

    private Stream<String> namesOf(TagCategory category) {
        return values.stream()
                .filter(tag -> tag.isOf(category))
                .map(IngredientTag::name);
    }
}
