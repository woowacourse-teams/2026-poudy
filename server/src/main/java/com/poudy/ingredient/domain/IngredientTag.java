package com.poudy.ingredient.domain;

import com.poudy.tag.domain.TagCategory;

public record IngredientTag(String name, TagCategory category, String source) {

    public boolean isOf(TagCategory other) {
        return category == other;
    }
}
