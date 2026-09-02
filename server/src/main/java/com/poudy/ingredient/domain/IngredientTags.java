package com.poudy.ingredient.domain;

import com.poudy.tag.domain.FormulationRole;
import com.poudy.tag.domain.SkinEffect;
import com.poudy.tag.domain.TagCategory;
import java.util.List;
import java.util.Objects;

public final class IngredientTags {

    private final List<IngredientTag> values;

    private IngredientTags(List<IngredientTag> values) {
        this.values = values;
    }

    public static IngredientTags from(List<IngredientTag> values) {
        return new IngredientTags(List.copyOf(Objects.requireNonNullElse(values, List.of())));
    }

    public List<IngredientTag> values() {
        return values;
    }

    public List<FormulationRole> formulationRoles() {
        return values.stream()
            .filter(tag -> tag.isOf(TagCategory.FUNCTION))
            .map(IngredientTag::formulationRole)
            .toList();
    }

    public List<SkinEffect> skinEffects() {
        return values.stream()
            .filter(tag -> tag.isOf(TagCategory.BIOLOGICAL_EFFECT))
            .map(IngredientTag::skinEffect)
            .toList();
    }

    public List<String> effectSources() {
        return values.stream()
            .filter(IngredientTag::isDisplayedSkinEffect)
            .flatMap(tag -> tag.sources().stream())
            .distinct()
            .toList();
    }

}
