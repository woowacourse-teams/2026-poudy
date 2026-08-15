package com.poudy.excludecode.domain;

import com.poudy.ingredient.domain.Ingredients;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Stream;

public record ResolvedExcludeCode(ExcludeCode code, List<ExcludeCodeIngredient> found, List<String> missing) {

    public ResolvedExcludeCode {
        found = List.copyOf(found);
        missing = List.copyOf(missing);
    }

    public static ResolvedExcludeCode of(ExcludeCode code, Ingredients ingredients) {
        List<ExcludeCodeIngredient> found = new ArrayList<>();
        List<String> missing = new ArrayList<>();

        for (String name : code.ingredientNames()) {
            // spotless:off
            ingredients.findByName(name)
                    .map(ExcludeCodeIngredient::from)
                    .ifPresentOrElse(found::add, () -> missing.add(name));
            // spotless:on
        }

        return new ResolvedExcludeCode(code, found, missing);
    }

    public Stream<String> missingNames() {
        // spotless:off
        return missing.stream()
                .map(name -> code + " 의 " + name);
        // spotless:on
    }
}
