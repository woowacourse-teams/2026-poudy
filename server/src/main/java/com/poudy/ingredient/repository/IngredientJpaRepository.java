package com.poudy.ingredient.repository;

import com.poudy.ingredient.domain.Ingredient;
import java.util.List;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;

public interface IngredientJpaRepository extends Repository<Ingredient, Long> {

    @Query("select ingredient from Ingredient ingredient order by ingredient.id")
    List<Ingredient> findAllIngredients();
}
