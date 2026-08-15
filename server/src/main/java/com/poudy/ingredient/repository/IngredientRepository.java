package com.poudy.ingredient.repository;

import com.poudy.common.json.JsonDataReader;
import com.poudy.ingredient.domain.Ingredient;
import com.poudy.ingredient.domain.Ingredients;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Repository;

@Repository
public class IngredientRepository {

    private static final String INGREDIENTS_FILE_NAME = "ingredients.json";

    private final Ingredients ingredients;

    public IngredientRepository(JsonDataReader jsonDataReader) {
        this.ingredients = new Ingredients(jsonDataReader.readList(INGREDIENTS_FILE_NAME, Ingredient.class));
    }

    public List<Ingredient> search(String keyword) {
        return ingredients.search(keyword);
    }

    public Optional<Ingredient> findById(Long id) {
        return ingredients.findById(id);
    }

    public Optional<Ingredient> findByName(String name) {
        return ingredients.findByName(name);
    }
}
