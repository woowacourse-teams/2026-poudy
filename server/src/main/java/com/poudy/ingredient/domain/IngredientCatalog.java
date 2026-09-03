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

    private final Map<Long, Ingredient> ingredients;

    private IngredientCatalog(Map<Long, Ingredient> ingredients) {
        this.ingredients = ingredients;
    }

    public static IngredientCatalog from(List<Ingredient> ingredients) {
        List<Ingredient> copied = List.copyOf(Objects.requireNonNullElse(ingredients, List.of()));
        Map<Long, Ingredient> indexedIngredients = new LinkedHashMap<>();

        for (Ingredient ingredient : copied) {
            if (indexedIngredients.putIfAbsent(ingredient.id(), ingredient) != null) {
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

        return ingredients.values().stream()
            .map(ingredient -> ingredient.match(searchKeyword))
            .flatMap(Optional::stream)
            .sorted(MatchedIngredient.order())
            .limit(SEARCH_RESULT_LIMIT)
            .toList();
    }

    public Optional<Ingredient> findById(Long id) {
        return Optional.ofNullable(ingredients.get(id));
    }

    public List<Ingredient> values() {
        return List.copyOf(ingredients.values());
    }

    public IngredientPage page(int page, int size) {
        if (page < 0 || size < 1) {
            throw new IllegalArgumentException("페이지 조건이 올바르지 않습니다.");
        }

        List<Ingredient> items = ingredients.values().stream()
            .skip((long) page * size)
            .limit(size)
            .toList();

        return new IngredientPage(items, ingredients.size());
    }

    public IngredientCatalog findAllById(Collection<Long> ids) {
        Map<Long, Ingredient> foundIngredients = new LinkedHashMap<>();
        for (Long id : Objects.requireNonNullElse(ids, List.<Long>of())) {
            Ingredient found = ingredients.get(id);
            if (found != null) {
                foundIngredients.putIfAbsent(id, found);
            }
        }

        return new IngredientCatalog(Collections.unmodifiableMap(foundIngredients));
    }

    public Ingredients resolveInOrder(Collection<Long> ids) {
        List<Ingredient> resolvedIngredients = Objects.requireNonNullElse(ids, List.<Long>of()).stream()
            .map(ingredients::get)
            .filter(Objects::nonNull)
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
        return ingredients.values().stream()
            .filter(match)
            .min(Comparator.comparing(Ingredient::id));
    }
}
