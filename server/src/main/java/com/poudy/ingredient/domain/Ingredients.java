package com.poudy.ingredient.domain;

import com.poudy.search.domain.SearchKeyword;
import java.util.Collection;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.function.Function;
import java.util.function.Predicate;
import java.util.stream.Collectors;

public class Ingredients {

    public static final int SEARCH_RESULT_LIMIT = 5;

    private final List<SearchableIngredient> searchable;
    private final Map<Long, SearchableIngredient> byId;

    public Ingredients(List<Ingredient> values) {
        this.searchable = searchableOf(values);
        this.byId = indexOf(this.searchable);
    }

    // 이미 계산해 둔 검색 표현을 그대로 물려받는다. 부분집합을 만들 때마다 이름을 다시 정규화하면
    // 제품 수만큼 그 비용이 기동 시점에 쌓인다.
    private Ingredients(List<SearchableIngredient> searchable, Map<Long, SearchableIngredient> byId) {
        this.searchable = searchable;
        this.byId = byId;
    }

    public List<Ingredient> search(String keyword) {
        SearchKeyword searchKeyword = new SearchKeyword(keyword);

        return searchable.stream()
                .map(ingredient -> MatchedIngredient.of(ingredient, searchKeyword))
                .filter(MatchedIngredient::isFound)
                .sorted(MatchedIngredient.order())
                .limit(SEARCH_RESULT_LIMIT)
                .map(MatchedIngredient::ingredient)
                .toList();
    }

    public Optional<Ingredient> findById(Long id) {
        return Optional.ofNullable(byId.get(id))
                .map(SearchableIngredient::ingredient);
    }

    public boolean containsAll(Collection<Long> ids) {
        return ids.stream().allMatch(byId::containsKey);
    }

    public boolean containsAny(Collection<Long> ids) {
        return ids.stream().anyMatch(byId::containsKey);
    }

    public List<Ingredient> values() {
        return searchable.stream()
                .map(SearchableIngredient::ingredient)
                .toList();
    }

    public IngredientPage page(int page, int size) {
        if (page < 0 || size < 1) {
            throw new IllegalArgumentException("페이지 조건이 올바르지 않습니다.");
        }

        List<Ingredient> items = searchable.stream()
                .skip((long) page * size)
                .limit(size)
                .map(SearchableIngredient::ingredient)
                .toList();

        return new IngredientPage(items, searchable.size());
    }

    public Ingredients findAllById(Collection<Long> ids) {
        List<SearchableIngredient> found = ids.stream()
                .map(byId::get)
                .filter(Objects::nonNull)
                .toList();

        return new Ingredients(found, indexOf(found));
    }

    public Optional<Ingredient> findByName(String name) {
        if (name == null || name.isEmpty()) {
            return Optional.empty();
        }

        return firstOf(ingredient -> ingredient.hasKoreanName(name))
                .or(() -> firstOf(ingredient -> ingredient.hasEnglishName(name)));
    }

    private Optional<Ingredient> firstOf(Predicate<Ingredient> match) {
        return searchable.stream()
                .map(SearchableIngredient::ingredient)
                .filter(match)
                .min(Comparator.comparing(Ingredient::id));
    }

    private static List<SearchableIngredient> searchableOf(List<Ingredient> values) {
        return Objects.requireNonNullElse(values, List.<Ingredient>of()).stream()
                .map(SearchableIngredient::of)
                .toList();
    }

    private static Map<Long, SearchableIngredient> indexOf(List<SearchableIngredient> searchable) {
        return searchable.stream()
                .collect(
                        Collectors.toUnmodifiableMap(
                                found -> found.ingredient().id(),
                                Function.identity(),
                                (first, second) -> first));
    }
}
