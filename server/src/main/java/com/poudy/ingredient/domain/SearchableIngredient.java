package com.poudy.ingredient.domain;

import com.poudy.common.domain.NameMatch;
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
        // spotless:off
        return new SearchableIngredient(
                ingredient,
                Stream.of(ingredient.koreanName(), ingredient.englishName()).map(SearchableText::of).toList(),
                ingredient.aliases().stream().map(SearchableText::of).toList());
        // spotless:on
    }

    public NameMatch match(SearchKeyword keyword) {
        return best(names, keyword);
    }

    public NameMatch aliasMatch(SearchKeyword keyword) {
        return best(aliases, keyword);
    }

    private static NameMatch best(List<SearchableText> candidates, SearchKeyword keyword) {
        // spotless:off
        return candidates.stream()
                .map(keyword::match)
                .min(Comparator.naturalOrder())
                .orElse(NameMatch.NONE);
        // spotless:on
    }
}
