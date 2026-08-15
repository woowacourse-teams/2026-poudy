package com.poudy.product.domain;

public record ProductIngredient(Long ingredientId) {

    public boolean hasId(Long other) {
        return ingredientId.equals(other);
    }
}
