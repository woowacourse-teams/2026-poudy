package com.poudy.ingredient.repository;

import java.util.List;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;

public interface IngredientJpaRepository extends Repository<IngredientEntity, Long> {

    @Query("select ingredient from IngredientEntity ingredient order by ingredient.id")
    List<IngredientEntity> findAllIngredients();

    @Query("select alias from IngredientAliasEntity alias order by alias.ingredientId, alias.id")
    List<IngredientAliasEntity> findAllAliases();

    @Query("select tag from IngredientTagEntity tag order by tag.id.ingredientId, tag.displayOrder")
    List<IngredientTagEntity> findAllTags();

    @Query("select source from IngredientSourceEntity source order by source.ingredientId, source.id")
    List<IngredientSourceEntity> findAllSources();
}
