package com.poudy.skinfilter.domain;

import com.poudy.excludecode.domain.ExcludeCode;
import com.poudy.ingredient.domain.Ingredient;
import java.util.List;

public record SkinFilterIngredient(Ingredient ingredient, List<ExcludeCode> groupCodes) {
}
