package com.poudy.ingredient.domain;

import com.poudy.search.domain.NameRank;
import com.poudy.search.domain.SearchKeyword;
import com.poudy.search.domain.TextMatch;
import java.util.Comparator;
import java.util.Optional;

public final class MatchedIngredient {

    private static final Comparator<MatchedIngredient> ORDER = Comparator.comparing(MatchedIngredient::nameRank)
        .thenComparing(MatchedIngredient::aliasRank).thenComparing(matched -> matched.ingredient().id());

    private final Ingredient ingredient;
    private final IngredientMatchField field;
    private final TextMatch textMatch;
    private final NameRank nameRank;

    public MatchedIngredient(
        Ingredient ingredient,
        IngredientMatchField field,
        TextMatch textMatch,
        NameRank nameRank
    ) {
        if (ingredient == null || field == null || textMatch == null || nameRank == null) {
            throw new IllegalArgumentException("성분 검색 일치 결과의 값이 필요합니다.");
        }
        this.ingredient = ingredient;
        this.field = field;
        this.textMatch = textMatch;
        this.nameRank = nameRank;
    }

    static Optional<MatchedIngredient> of(SearchableIngredient searchable, SearchKeyword keyword) {
        NameRank nameRank = searchable.nameRank(keyword);
        Optional<IngredientTextMatch> nameMatch = searchable.findNameMatch(keyword);
        if (nameMatch.isPresent()) {
            return Optional.of(from(searchable.ingredient(), nameMatch.get(), nameRank));
        }
        return searchable.findAliasMatch(keyword)
            .map(match -> from(searchable.ingredient(), match, nameRank));
    }

    public static Comparator<MatchedIngredient> order() {
        return ORDER;
    }

    public Ingredient ingredient() {
        return ingredient;
    }

    public IngredientMatchField field() {
        return field;
    }

    public TextMatch textMatch() {
        return textMatch;
    }

    private static MatchedIngredient from(
        Ingredient ingredient,
        IngredientTextMatch match,
        NameRank nameRank
    ) {
        return new MatchedIngredient(ingredient, match.field(), match.textMatch(), nameRank);
    }

    private NameRank nameRank() {
        return nameRank;
    }

    private NameRank aliasRank() {
        if (field != IngredientMatchField.ALIAS) {
            return NameRank.NONE;
        }

        return textMatch.rank();
    }
}
