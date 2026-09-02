package com.poudy.ingredient.domain;

import com.poudy.tag.domain.FormulationRole;
import com.poudy.tag.domain.SkinEffect;
import com.poudy.tag.domain.Tag;
import com.poudy.tag.domain.TagCategory;
import java.util.List;
import java.util.Objects;

public final class IngredientTag {

    private final Tag tag;
    private final String source;

    public IngredientTag(Tag tag, String source) {
        this.tag = Objects.requireNonNull(tag, "성분 태그가 필요합니다.");
        this.source = source;
        if (Evidence.ofTag(source).isDeferred()) {
            throw new DeferredTagEvidenceException();
        }
    }

    public Tag tag() {
        return tag;
    }

    public String source() {
        return source;
    }

    public boolean isOf(TagCategory other) {
        return tag.isOf(other);
    }

    public boolean isDisplayedSkinEffect() {
        return isOf(TagCategory.BIOLOGICAL_EFFECT);
    }

    public FormulationRole formulationRole() {
        if (!isOf(TagCategory.FUNCTION)) {
            throw new IllegalArgumentException("배합 목적은 FUNCTION 태그로 만들어야 합니다.");
        }

        return new FormulationRole(tag.id(), tag.code(), tag.name());
    }

    public SkinEffect skinEffect() {
        if (!isOf(TagCategory.BIOLOGICAL_EFFECT)) {
            throw new IllegalArgumentException("피부 작용은 BIOLOGICAL_EFFECT 태그로 만들어야 합니다.");
        }

        return new SkinEffect(tag.id(), tag.code(), tag.name());
    }

    public List<String> sources() {
        return Evidence.ofTag(source).sources();
    }
}
