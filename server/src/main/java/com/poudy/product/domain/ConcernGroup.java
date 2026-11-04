package com.poudy.product.domain;

import com.poudy.ingredient.domain.Ingredients;
import com.poudy.ingredientgroup.domain.IngredientBundle;
import com.poudy.ingredientgroup.domain.IngredientGroupCatalog;
import com.poudy.tag.domain.SkinEffect;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

public final class ConcernGroup {

    private static final int MAX_VISIBLE_CONCERNS = 3;

    private final Concern concern;
    private final List<SkinEffect> effects;
    private final List<IngredientBundle> items;

    private ConcernGroup(Concern concern, List<SkinEffect> effects, List<IngredientBundle> items) {
        this.concern = concern;
        this.effects = List.copyOf(effects);
        this.items = List.copyOf(items);
    }

    static List<ConcernGroup> from(Ingredients ingredients, IngredientGroupCatalog groups) {
        return Arrays.stream(Concern.values())
            .map(concern -> create(concern, ingredients, groups))
            .filter(group -> !group.effects.isEmpty())
            .sorted(Comparator.comparingLong(ConcernGroup::ingredientCount).reversed())
            .limit(MAX_VISIBLE_CONCERNS)
            .toList();
    }

    private static ConcernGroup create(Concern concern, Ingredients ingredients, IngredientGroupCatalog groups) {
        List<ConcernEffect> matching = concern.effectsIn(ingredients);
        Set<Long> matchingIds = matching.stream()
            .flatMap(effect -> effect.ingredientIds().stream())
            .collect(Collectors.toSet());
        List<Long> orderedIds = ingredients.ids().stream().filter(matchingIds::contains).distinct().toList();
        return new ConcernGroup(
            concern,
            matching.stream().map(ConcernEffect::effect).toList(),
            groups.bundle(orderedIds)
        );
    }

    private long ingredientCount() {
        return items.stream()
            .flatMap(item -> item.ingredientIds().stream())
            .distinct()
            .count();
    }

    public Concern concern() {
        return concern;
    }

    public List<SkinEffect> effects() {
        return effects;
    }

    public List<IngredientBundle> items() {
        return items;
    }
}
