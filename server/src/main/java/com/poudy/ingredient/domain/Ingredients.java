package com.poudy.ingredient.domain;

import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

public class Ingredients {

    private final List<Ingredient> values;
    private final Map<Long, Ingredient> byId;

    public Ingredients(List<Ingredient> values) {
        this.values = values == null ? List.of() : List.copyOf(values);
        this.byId = this.values.stream()
                .collect(Collectors.toUnmodifiableMap(Ingredient::id, Function.identity(), (first, second) -> first));
    }

    public List<Ingredient> search(String keyword) {
        String normalizedKeyword = keyword.strip().toLowerCase(Locale.ROOT);

        return values.stream().filter(ingredient -> matches(ingredient, normalizedKeyword)).toList();
    }

    public Optional<Ingredient> findById(Long id) {
        return Optional.ofNullable(byId.get(id));
    }

    public List<Ingredient> values() {
        return values;
    }

    private static boolean matches(Ingredient ingredient, String keyword) {
        return contains(ingredient.koreanName(), keyword) || contains(ingredient.englishName(), keyword)
                || ingredient.aliases().stream().anyMatch(alias -> contains(alias, keyword));
    }

    private static boolean contains(String value, String keyword) {
        return value != null && value.toLowerCase(Locale.ROOT).contains(keyword);
    }
}
