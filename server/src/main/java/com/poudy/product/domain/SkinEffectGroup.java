package com.poudy.product.domain;

import com.poudy.tag.domain.SkinEffect;
import java.util.List;

public record SkinEffectGroup(SkinEffect effect, List<Long> ingredientIds) {

    public SkinEffectGroup {
        ingredientIds = List.copyOf(ingredientIds);
    }
}
