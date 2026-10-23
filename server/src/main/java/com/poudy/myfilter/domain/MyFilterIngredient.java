package com.poudy.myfilter.domain;

import com.poudy.excludecode.domain.ExcludeCode;
import com.poudy.ingredient.domain.Ingredient;
import java.util.List;

public record MyFilterIngredient(Ingredient ingredient, List<ExcludeCode> excludeCodes) {
}
