package com.poudy.ingredient.domain;

import com.poudy.tag.domain.FormulationRole;
import com.poudy.tag.domain.SkinEffect;
import com.poudy.tag.domain.Tag;
import com.poudy.tag.domain.TagCategory;
import java.util.List;
import java.util.Objects;

public final class IngredientTag {

    private static final String DEFERRED_PREFIX = "태그 보류";

    private final Tag tag;
    private final List<String> sources;

    public IngredientTag(Tag tag, List<String> sources) {
        this.tag = Objects.requireNonNull(tag, "성분 태그가 필요합니다.");
        this.sources = List.copyOf(Objects.requireNonNullElse(sources, List.<String>of()));
        if (this.sources.stream().anyMatch(source -> source.strip().startsWith(DEFERRED_PREFIX))) {
            throw new DeferredTagEvidenceException();
        }
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
        return sources;
    }
}
