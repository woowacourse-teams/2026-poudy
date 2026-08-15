package com.poudy.ingredient.domain;

import com.poudy.common.domain.SearchKeyword;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

public class Ingredients {

    private final List<Ingredient> values;
    private final Map<Long, Ingredient> byId;

    public Ingredients(List<Ingredient> values) {
        this.values = List.copyOf(Objects.requireNonNullElse(values, List.of()));
        // spotless:off
        this.byId = this.values.stream()
                .collect(Collectors.toUnmodifiableMap(Ingredient::id, Function.identity(), (first, second) -> first));
        // spotless:on
    }

    public List<Ingredient> search(String keyword) {
        SearchKeyword searchKeyword = new SearchKeyword(keyword);

        // spotless:off
        return values.stream()
                .filter(ingredient -> ingredient.matches(searchKeyword))
                .toList();
        // spotless:on
    }

    public Optional<Ingredient> findById(Long id) {
        return Optional.ofNullable(byId.get(id));
    }

    // 같은 이름을 가진 성분이 여럿이면 먼저 등록된 성분을 쓴다.
    public Optional<Ingredient> findByName(String name) {
        // spotless:off
        return values.stream()
                .filter(ingredient -> ingredient.hasName(name))
                .min(Comparator.comparing(Ingredient::id));
        // spotless:on
    }
}
