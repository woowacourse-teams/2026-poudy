package com.poudy.excludecode.repository;

import java.util.List;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;

public interface ExcludeCodeJpaRepository extends Repository<ExcludeCodeIngredientEntity, ExcludeCodeIngredientId> {

    @Query("select mapping from ExcludeCodeIngredientEntity mapping"
        + " order by mapping.id.excludeCode, mapping.displayOrder")
    List<ExcludeCodeIngredientEntity> findAllMappings();
}
