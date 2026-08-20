package com.poudy.ingredient.domain;

import com.poudy.common.domain.NameRank;
import com.poudy.common.domain.SearchKeyword;
import com.poudy.common.domain.SearchableText;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Stream;

public record SearchableIngredient(Ingredient ingredient, List<SearchableText> names, List<SearchableText> aliases) {

    public SearchableIngredient {
        names = List.copyOf(names);
        aliases = List.copyOf(aliases);
    }

    public static SearchableIngredient of(Ingredient ingredient) {
        return new SearchableIngredient(
                ingredient,
                Stream.of(ingredient.koreanName(), ingredient.englishName()).map(SearchableText::of).toList(),
                ingredient.aliases().stream().map(SearchableText::of).toList());
    }

    public NameRank match(SearchKeyword keyword) {
        return best(names, keyword);
    }

    public NameRank aliasMatch(SearchKeyword keyword) {
        return best(aliases, keyword);
    }

    private static NameRank best(List<SearchableText> candidates, SearchKeyword keyword) {
        return candidates.stream()
                .map(candidate -> NameRank.of(keyword.match(candidate), candidate))
                .min(Comparator.naturalOrder())
                .orElse(NameRank.NONE);
    }
}
