package com.poudy.ingredient.domain;

import com.poudy.tag.domain.SkinEffect;
import com.poudy.tag.domain.TagCategory;
import java.util.List;

public record IngredientTag(String name, TagCategory category, String source) {

    public IngredientTag {
        if (Evidence.ofTag(source).isDeferred()) {
            throw new DeferredTagEvidenceException();
        }
    }

    public boolean isOf(TagCategory other) {
        return category == other;
    }

    public boolean isDisplayedSkinEffect() {
        return isOf(TagCategory.BIOLOGICAL_EFFECT) && SkinEffect.from(name).isPresent();
    }

    public List<String> sources() {
        return Evidence.ofTag(source).sources();
    }
}
