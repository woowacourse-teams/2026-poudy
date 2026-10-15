package com.poudy.shelf.domain;

import com.poudy.ingredient.domain.Ingredient;
import com.poudy.product.domain.Product;
import java.util.List;

public record AnalyzedIngredient(Ingredient ingredient, List<Product> products, boolean inFilter, boolean isNew) {
}
