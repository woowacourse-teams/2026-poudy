package com.poudy.ingredient.domain;

import com.poudy.search.domain.NameRank;
import com.poudy.search.domain.SearchKeyword;
import com.poudy.search.domain.SearchableText;
import com.poudy.search.domain.TextMatch;
import java.util.List;
import java.util.Optional;

final class SearchableIngredient {

    private final Ingredient ingredient;
    private final List<SearchableText> koreanNames;
    private final List<SearchableText> englishNames;
    private final List<SearchableText> aliases;

    private SearchableIngredient(
        Ingredient ingredient,
        List<SearchableText> koreanNames,
        List<SearchableText> englishNames,
        List<SearchableText> aliases
    ) {
        this.ingredient = ingredient;
        this.koreanNames = List.copyOf(koreanNames);
        this.englishNames = List.copyOf(englishNames);
        this.aliases = List.copyOf(aliases);
    }

    Ingredient ingredient() {
        return ingredient;
    }

    static SearchableIngredient of(Ingredient ingredient) {
        return new SearchableIngredient(
            ingredient,
            SearchableText.formsOf(ingredient.koreanName()),
            SearchableText.formsOf(ingredient.englishName()),
            ingredient.aliases().stream()
                .flatMap(alias -> SearchableText.formsOf(alias).stream())
                .toList()
        );
    }

    Optional<IngredientTextMatch> findNameMatch(SearchKeyword keyword) {
        Optional<TextMatch> koreanNameMatch = TextMatch.best(koreanNames, keyword);
        Optional<TextMatch> englishNameMatch = TextMatch.best(englishNames, keyword);

        if (isBetterThan(englishNameMatch, koreanNameMatch)) {
            return englishNameMatch.map(match -> new IngredientTextMatch(IngredientMatchField.ENGLISH_NAME, match));
        }
        return koreanNameMatch.map(match -> new IngredientTextMatch(IngredientMatchField.KOREAN_NAME, match));
    }

    Optional<IngredientTextMatch> findAliasMatch(SearchKeyword keyword) {
        return TextMatch.best(aliases, keyword)
            .map(match -> new IngredientTextMatch(IngredientMatchField.ALIAS, match));
    }

    NameRank nameRank(SearchKeyword keyword) {
        NameRank koreanNameRank = NameRank.best(koreanNames, keyword);
        NameRank englishNameRank = NameRank.best(englishNames, keyword);

        if (englishNameRank.isBetterThan(koreanNameRank)) {
            return englishNameRank;
        }
        return koreanNameRank;
    }

    private static boolean isBetterThan(Optional<TextMatch> candidate, Optional<TextMatch> current) {
        if (candidate.isEmpty()) {
            return false;
        }
        return current.isEmpty() || candidate.get().rank().isBetterThan(current.get().rank());
    }
}
