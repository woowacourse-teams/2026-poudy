package com.poudy.ingredient.domain;

import com.poudy.tag.domain.FormulationRole;
import com.poudy.tag.domain.SkinEffect;
import com.poudy.tag.domain.TagCategory;
import java.util.List;
import java.util.Objects;

final class IngredientTags {

    private final List<IngredientTag> values;

    private IngredientTags(List<IngredientTag> values) {
        this.values = values;
    }

    static IngredientTags from(List<IngredientTag> values) {
        return new IngredientTags(List.copyOf(Objects.requireNonNullElse(values, List.of())));
    }

    List<IngredientTag> values() {
        return values;
    }

    List<FormulationRole> formulationRoles() {
        return values.stream()
            .filter(tag -> tag.isOf(TagCategory.FUNCTION))
            .map(IngredientTag::formulationRole)
            .toList();
    }

    List<SkinEffect> skinEffects() {
        return values.stream()
            .filter(tag -> tag.isOf(TagCategory.BIOLOGICAL_EFFECT))
            .map(IngredientTag::skinEffect)
            .toList();
    }

    List<String> effectSources() {
        return values.stream()
            .filter(IngredientTag::isDisplayedSkinEffect)
            .flatMap(tag -> tag.sources().stream())
            .distinct()
            .toList();
    }

}
