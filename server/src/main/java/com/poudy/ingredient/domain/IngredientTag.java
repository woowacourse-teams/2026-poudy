package com.poudy.ingredient.domain;

import com.poudy.tag.domain.TagCategory;

public record IngredientTag(String name, TagCategory category, String source) {

    public IngredientTag {
        // spotless:off
        if (EvidenceSources.parseTag(source).stream()
                .anyMatch(evidence -> evidence.startsWith("태그 보류"))) {
            throw new IllegalArgumentException("근거가 보류된 태그는 매핑할 수 없습니다.");
        }
        // spotless:on
    }

    public boolean isOf(TagCategory other) {
        return category == other;
    }
}
