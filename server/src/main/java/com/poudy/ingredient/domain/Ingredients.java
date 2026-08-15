package com.poudy.ingredient.domain;

import com.poudy.common.domain.SearchKeyword;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.function.BinaryOperator;
import java.util.function.Function;
import java.util.stream.Collectors;

public class Ingredients {

    private final List<Ingredient> values;
    private final Map<Long, Ingredient> byId;
    private final Map<String, Ingredient> byKoreanName;
    private final Map<String, Ingredient> byEnglishName;

    public Ingredients(List<Ingredient> values) {
        this.values = List.copyOf(Objects.requireNonNullElse(values, List.of()));
        // spotless:off
        this.byId = this.values.stream()
                .collect(Collectors.toUnmodifiableMap(Ingredient::id, Function.identity(), (first, second) -> first));
        // spotless:on
        this.byKoreanName = index(Ingredient::koreanName);
        this.byEnglishName = index(ingredient -> lowerCase(ingredient.englishName()));
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

    public Optional<Ingredient> findByName(String name) {
        // spotless:off
        return Optional.ofNullable(byKoreanName.get(name))
                .or(() -> Optional.ofNullable(byEnglishName.get(lowerCase(name))));
        // spotless:on
    }

    private Map<String, Ingredient> index(Function<Ingredient, String> key) {
        // spotless:off
        return values.stream()
                .filter(ingredient -> !key.apply(ingredient).isEmpty())
                .collect(Collectors.toMap(
                        key,
                        Function.identity(),
                        BinaryOperator.minBy(Comparator.comparing(Ingredient::id)),
                        LinkedHashMap::new));
        // spotless:on
    }

    private static String lowerCase(String name) {
        return name.toLowerCase(Locale.ROOT);
    }
}
