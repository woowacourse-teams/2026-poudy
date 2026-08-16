package com.poudy.ingredient.domain;

import com.poudy.common.domain.SearchKeyword;
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

        // spotless:off
        return searchable.stream()
                .map(ingredient -> MatchedIngredient.of(ingredient, searchKeyword))
                .filter(MatchedIngredient::isFound)
                .sorted(MatchedIngredient.order())
                .map(MatchedIngredient::ingredient)
                .toList();
        // spotless:on
    }

    public Optional<Ingredient> findById(Long id) {
        // spotless:off
        return Optional.ofNullable(byId.get(id))
                .map(SearchableIngredient::ingredient);
        // spotless:on
    }

    public Ingredients findAllById(Collection<Long> ids) {
        // spotless:off
        List<SearchableIngredient> found = ids.stream()
                .map(byId::get)
                .filter(Objects::nonNull)
                .toList();
        // spotless:on

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
        // spotless:off
        return searchable.stream()
                .map(SearchableIngredient::ingredient)
                .filter(match)
                .min(Comparator.comparing(Ingredient::id));
        // spotless:on
    }

    private static List<SearchableIngredient> searchableOf(List<Ingredient> values) {
        // spotless:off
        return Objects.requireNonNullElse(values, List.<Ingredient>of()).stream()
                .map(SearchableIngredient::of)
                .toList();
        // spotless:on
    }

    private static Map<Long, SearchableIngredient> indexOf(List<SearchableIngredient> searchable) {
        // spotless:off
        return searchable.stream()
                .collect(Collectors.toUnmodifiableMap(
                        found -> found.ingredient().id(), Function.identity(), (first, second) -> first));
        // spotless:on
    }
}
