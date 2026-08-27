package com.poudy.ingredient.domain;

import com.poudy.search.domain.NameRank;
import com.poudy.search.domain.SearchKeyword;
import com.poudy.search.domain.SearchableText;
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
        return NameRank.best(names, keyword);
    }

    public NameRank aliasMatch(SearchKeyword keyword) {
        return NameRank.best(aliases, keyword);
    }
}
