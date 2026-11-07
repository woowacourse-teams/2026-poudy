package com.poudy.product.domain;

import com.poudy.ingredient.domain.Ingredient;
import com.poudy.ingredient.domain.Ingredients;
import com.poudy.tag.domain.SkinEffect;
import java.util.List;
import java.util.Optional;

final class ConcernEffect {

    private final SkinEffect effect;
    private final List<Long> ingredientIds;

    private ConcernEffect(SkinEffect effect, List<Long> ingredientIds) {
        this.effect = effect;
        this.ingredientIds = List.copyOf(ingredientIds);
    }

    static Optional<ConcernEffect> find(String code, Ingredients ingredients) {
        List<Ingredient> matching = ingredients.values().stream()
            .filter(ingredient -> ingredient.skinEffects().stream().anyMatch(effect -> effect.code().equals(code)))
            .toList();
        if (matching.isEmpty()) {
            return Optional.empty();
        }

        SkinEffect effect = matching.getFirst().skinEffects().stream()
            .filter(candidate -> candidate.code().equals(code))
            .findFirst().orElseThrow();
        List<Long> ids = matching.stream().map(Ingredient::id).distinct().toList();
        return Optional.of(new ConcernEffect(effect, ids));
    }

    SkinEffect effect() {
        return effect;
    }

    List<Long> ingredientIds() {
        return ingredientIds;
    }
}
