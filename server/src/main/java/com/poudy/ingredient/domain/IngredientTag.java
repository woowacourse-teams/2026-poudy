package com.poudy.ingredient.domain;

import com.poudy.tag.domain.TagCategory;

public record IngredientTag(String name, TagCategory category, String source) {

    public IngredientTag {
        if (EvidenceSources.parseTag(source).stream().anyMatch(evidence -> evidence.startsWith("태그 보류"))) {
            throw new IllegalArgumentException("근거가 보류된 태그는 매핑할 수 없습니다.");
        }
    }

    public boolean isOf(TagCategory other) {
        return category == other;
    }
}
