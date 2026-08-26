package com.poudy.ingredient.domain;

import com.poudy.search.domain.NameRank;
import com.poudy.search.domain.SearchKeyword;
import java.util.Comparator;

public record MatchedIngredient(Ingredient ingredient, NameRank match, NameRank aliasMatch) {

    private static final Comparator<MatchedIngredient> ORDER = Comparator.comparing(MatchedIngredient::match)
            .thenComparing(MatchedIngredient::aliasRank).thenComparing(matched -> matched.ingredient().id());

    public static MatchedIngredient of(SearchableIngredient searchable, SearchKeyword keyword) {
        return new MatchedIngredient(
                searchable.ingredient(),
                searchable.match(keyword),
                searchable.aliasMatch(keyword));
    }

    public static Comparator<MatchedIngredient> order() {
        return ORDER;
    }

    public boolean isFound() {
        return match.isFound() || aliasMatch.isFound();
    }

    private NameRank aliasRank() {
        if (match.isFound()) {
            return NameRank.NONE;
        }

        return aliasMatch;
    }
}
