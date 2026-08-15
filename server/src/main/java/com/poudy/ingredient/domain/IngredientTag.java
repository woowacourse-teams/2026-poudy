package com.poudy.ingredient.domain;

import com.poudy.tag.domain.SkinEffect;
import com.poudy.tag.domain.TagCategory;

public record IngredientTag(String name, TagCategory category, String source) {

    public IngredientTag {
        // spotless:off
        if (EvidenceSources.parseTag(source).stream()
                .anyMatch(evidence -> evidence.startsWith("태그 보류"))) {
            throw new DeferredTagEvidenceException();
        }
        // spotless:on
    }

    public boolean isOf(TagCategory other) {
        return category == other;
    }

    public boolean isDisplayedSkinEffect() {
        return isOf(TagCategory.BIOLOGICAL_EFFECT) && SkinEffect.from(name).isPresent();
    }
}
