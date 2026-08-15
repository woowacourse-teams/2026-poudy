package com.poudy.ingredient.domain;

import java.util.List;
import java.util.Locale;
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
        String normalizedKeyword = keyword.strip().toLowerCase(Locale.ROOT);

        // spotless:off
        return values.stream()
                .filter(ingredient -> ingredient.matches(normalizedKeyword))
                .toList();
        // spotless:on
    }

    public Optional<Ingredient> findById(Long id) {
        return Optional.ofNullable(byId.get(id));
    }

    public List<Ingredient> values() {
        return values;
    }

}
