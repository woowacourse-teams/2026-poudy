package com.poudy.ingredient.domain;

import java.util.List;

public interface IngredientGroups {

    List<ExcludeCode> codesOf(Long ingredientId);
}
