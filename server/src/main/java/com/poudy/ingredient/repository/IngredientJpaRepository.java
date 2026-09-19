package com.poudy.ingredient.repository;

import java.util.List;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;

public interface IngredientJpaRepository extends Repository<IngredientEntity, Long> {

    @Query("select ingredient from IngredientEntity ingredient order by ingredient.id")
    List<IngredientEntity> findAllIngredients();

    @Query("select alias from IngredientAliasEntity alias order by alias.id.ingredientId, alias.id.displayOrder")
    List<IngredientAliasEntity> findAllAliases();

    @Query("select tag from IngredientTagEntity tag order by tag.id.ingredientId, tag.displayOrder")
    List<IngredientTagEntity> findAllTags();

    @Query("select evidence from IngredientTagEvidenceEntity evidence"
        + " order by evidence.id.ingredientId, evidence.id.tagId, evidence.id.displayOrder")
    List<IngredientTagEvidenceEntity> findAllTagEvidence();

    @Query("select source from IngredientSourceEntity source order by source.id.ingredientId, source.id.displayOrder")
    List<IngredientSourceEntity> findAllSources();
}
