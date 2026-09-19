package com.poudy.ingredient.service;

import com.poudy.ingredient.domain.ExcludeCode;
import java.util.List;

public interface IngredientGroups {

    List<ExcludeCode> codesOf(Long ingredientId);
}
