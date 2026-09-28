package com.poudy.product.domain;

import com.poudy.excludecode.domain.ExcludeCodeGroup;
import com.poudy.ingredient.domain.Ingredient;
import com.poudy.ingredient.domain.Ingredients;
import com.poudy.tag.domain.SkinEffect;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

public record ProductPart(Long id, String name, Ingredients ingredients) {

    private static final int MAIN_SKIN_EFFECT_GROUP_LIMIT = 3;

    public boolean containsIngredientFrom(ExcludeCodeGroup group) {
        return group.containsAnyIngredient(Set.copyOf(ingredients.ids()));
    }

    public long countContainedFrom(List<ExcludeCodeGroup> groups) {
        return groups.stream().filter(this::containsIngredientFrom).count();
    }

    public List<SkinEffectGroup> skinEffectGroups() {
        Map<String, SkinEffectGroupAccumulator> groups = new HashMap<>();
        for (Ingredient ingredient : ingredients.values()) {
            for (SkinEffect effect : ingredient.skinEffects()) {
                SkinEffectGroupAccumulator group = groups.computeIfAbsent(
                    effect.id(),
                    ignored -> new SkinEffectGroupAccumulator(effect)
                );
                group.add(ingredient.id());
            }
        }

        return groups.values().stream()
            .map(SkinEffectGroupAccumulator::toGroup)
            .sorted(
                Comparator.comparingInt((SkinEffectGroup group) -> group.ingredientIds().size())
                    .reversed()
                    .thenComparing(group -> group.effect().id())
            )
            .limit(MAIN_SKIN_EFFECT_GROUP_LIMIT)
            .toList();
    }

    private static class SkinEffectGroupAccumulator {

        private final SkinEffect effect;
        private final List<Long> ingredientIds = new ArrayList<>();

        private SkinEffectGroupAccumulator(SkinEffect effect) {
            this.effect = effect;
        }

        private void add(Long ingredientId) {
            ingredientIds.add(ingredientId);
        }

        private SkinEffectGroup toGroup() {
            return new SkinEffectGroup(effect, ingredientIds);
        }
    }
}
