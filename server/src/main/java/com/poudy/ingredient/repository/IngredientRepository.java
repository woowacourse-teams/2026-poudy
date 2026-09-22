package com.poudy.ingredient.repository;

import com.poudy.common.persistence.SnapshotReader;
import com.poudy.exception.InfrastructureException;
import com.poudy.ingredient.domain.Ingredient;
import com.poudy.ingredient.domain.IngredientCatalog;
import com.poudy.ingredient.domain.MatchedIngredient;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Repository;

@Repository
public class IngredientRepository {

    private final IngredientCatalog ingredients;

    public IngredientRepository(IngredientJpaRepository ingredientJpaRepository, SnapshotReader snapshotReader) {
        this.ingredients = snapshotReader.read(() -> load(ingredientJpaRepository));
    }

    private static IngredientCatalog load(IngredientJpaRepository ingredientJpaRepository) {
        try {
            return IngredientCatalog.from(ingredientJpaRepository.findAllIngredients());
        } catch (IllegalArgumentException exception) {
            throw new InfrastructureException(exception.getMessage(), exception);
        }
    }

    public IngredientCatalog findAll() {
        return ingredients;
    }

    public List<MatchedIngredient> suggest(String keyword) {
        return ingredients.suggest(keyword);
    }

    public Optional<Ingredient> findById(Long id) {
        return ingredients.findById(id);
    }
}
