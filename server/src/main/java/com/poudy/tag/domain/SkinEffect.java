package com.poudy.tag.domain;

public record SkinEffect(Long id, String code, String displayName) {

    public static SkinEffect from(Tag tag) {
        if (!tag.isOf(TagCategory.BIOLOGICAL_EFFECT)) {
            throw new IllegalArgumentException("피부 작용은 BIOLOGICAL_EFFECT 태그로 만들어야 합니다.");
        }
        return new SkinEffect(tag.id(), tag.code(), tag.name());
    }
}
