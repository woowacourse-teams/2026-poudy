package com.poudy.excludecode.domain;

import java.util.List;

public interface IngredientGroups {

    List<ExcludeCode> codesOf(Long ingredientId);
}
