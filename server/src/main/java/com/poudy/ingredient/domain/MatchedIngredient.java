package com.poudy.ingredient.domain;

import com.poudy.common.domain.NameMatch;
import com.poudy.common.domain.SearchKeyword;
import java.util.Comparator;

public record MatchedIngredient(Ingredient ingredient, NameMatch match, NameMatch aliasMatch) {

    private static final Comparator<MatchedIngredient> ORDER = Comparator.comparing(MatchedIngredient::match)
            .thenComparing(MatchedIngredient::aliasRank).thenComparing(matched -> matched.ingredient().id());

    public static MatchedIngredient of(Ingredient ingredient, SearchKeyword keyword) {
        return new MatchedIngredient(ingredient, ingredient.match(keyword), ingredient.aliasMatch(keyword));
    }

    public static Comparator<MatchedIngredient> order() {
        return ORDER;
    }

    public boolean isFound() {
        return match.isFound() || aliasMatch.isFound();
    }

    private NameMatch aliasRank() {
        if (match.isFound()) {
            return NameMatch.NONE;
        }

        return aliasMatch;
    }
}
