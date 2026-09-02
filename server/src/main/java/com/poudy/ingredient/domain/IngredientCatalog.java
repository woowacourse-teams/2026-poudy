package com.poudy.ingredient.domain;

import com.poudy.search.domain.SearchKeyword;
import java.util.Collection;
import java.util.Collections;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.function.Predicate;

public final class IngredientCatalog {

    public static final int SEARCH_RESULT_LIMIT = 5;

    private final Map<Long, SearchableIngredient> ingredientsById;

    private IngredientCatalog(Map<Long, SearchableIngredient> ingredientsById) {
        this.ingredientsById = ingredientsById;
    }

    public static IngredientCatalog from(List<Ingredient> ingredients) {
        List<Ingredient> copied = List.copyOf(Objects.requireNonNullElse(ingredients, List.of()));
        Map<Long, SearchableIngredient> indexedIngredients = new LinkedHashMap<>();

        for (Ingredient ingredient : copied) {
            SearchableIngredient searchableIngredient = SearchableIngredient.of(ingredient);
            if (indexedIngredients.putIfAbsent(ingredient.id(), searchableIngredient) != null) {
                throw new IllegalArgumentException("성분 ID가 중복되었습니다: " + ingredient.id());
            }
        }

        return new IngredientCatalog(Collections.unmodifiableMap(indexedIngredients));
    }

    public List<Ingredient> search(String keyword) {
        return suggest(keyword).stream()
            .map(MatchedIngredient::ingredient)
            .toList();
    }

    public List<MatchedIngredient> suggest(String keyword) {
        SearchKeyword searchKeyword = new SearchKeyword(keyword);

        return ingredientsById.values().stream()
            .map(ingredient -> MatchedIngredient.of(ingredient, searchKeyword))
            .flatMap(Optional::stream)
            .sorted(MatchedIngredient.order())
            .limit(SEARCH_RESULT_LIMIT)
            .toList();
    }

    public Optional<Ingredient> findById(Long id) {
        return Optional.ofNullable(ingredientsById.get(id))
            .map(SearchableIngredient::ingredient);
    }

    public List<Ingredient> values() {
        return ingredientsById.values().stream()
            .map(SearchableIngredient::ingredient)
            .toList();
    }

    public IngredientPage page(int page, int size) {
        if (page < 0 || size < 1) {
            throw new IllegalArgumentException("페이지 조건이 올바르지 않습니다.");
        }

        List<Ingredient> items = ingredientsById.values().stream()
            .skip((long) page * size)
            .limit(size)
            .map(SearchableIngredient::ingredient)
            .toList();

        return new IngredientPage(items, ingredientsById.size());
    }

    public IngredientCatalog findAllById(Collection<Long> ids) {
        Map<Long, SearchableIngredient> foundIngredients = new LinkedHashMap<>();
        for (Long id : Objects.requireNonNullElse(ids, List.<Long>of())) {
            SearchableIngredient found = ingredientsById.get(id);
            if (found != null) {
                foundIngredients.putIfAbsent(id, found);
            }
        }

        return new IngredientCatalog(Collections.unmodifiableMap(foundIngredients));
    }

    public Ingredients resolveInOrder(Collection<Long> ids) {
        List<Ingredient> resolvedIngredients = Objects.requireNonNullElse(ids, List.<Long>of()).stream()
            .map(ingredientsById::get)
            .filter(Objects::nonNull)
            .map(SearchableIngredient::ingredient)
            .toList();

        return new Ingredients(resolvedIngredients);
    }

    public Optional<Ingredient> findByName(String name) {
        if (name == null || name.isEmpty()) {
            return Optional.empty();
        }

        return firstOf(ingredient -> ingredient.hasKoreanName(name))
            .or(() -> firstOf(ingredient -> ingredient.hasEnglishName(name)));
    }

    private Optional<Ingredient> firstOf(Predicate<Ingredient> match) {
        return ingredientsById.values().stream()
            .map(SearchableIngredient::ingredient)
            .filter(match)
            .min(Comparator.comparing(Ingredient::id));
    }
}
