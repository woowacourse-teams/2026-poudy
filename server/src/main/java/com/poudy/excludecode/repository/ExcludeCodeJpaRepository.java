package com.poudy.excludecode.repository;

import com.poudy.ingredient.domain.ExcludeCode;
import java.util.List;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;

public interface ExcludeCodeJpaRepository extends Repository<ExcludeCodeIngredientEntity, ExcludeCodeIngredientId> {

    @Query("select distinct mapping.id.excludeCode from ExcludeCodeIngredientEntity mapping")
    List<ExcludeCode> findDefinedCodes();

    @Query("select mapping.id.excludeCode from ExcludeCodeIngredientEntity mapping"
        + " where mapping.id.ingredientId = :ingredientId")
    List<ExcludeCode> findCodesByIngredientId(Long ingredientId);

    @Query("select distinct mapping.id.excludeCode from ExcludeCodeIngredientEntity mapping"
        + " where mapping.id.ingredientId in :ingredientIds")
    List<ExcludeCode> findCodesByIngredientIds(List<Long> ingredientIds);

    @Query("select mapping from ExcludeCodeIngredientEntity mapping"
        + " order by mapping.id.excludeCode, mapping.displayOrder")
    List<ExcludeCodeIngredientEntity> findAllMappings();
}
