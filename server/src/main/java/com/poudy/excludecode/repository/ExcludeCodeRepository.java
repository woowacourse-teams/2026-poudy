package com.poudy.excludecode.repository;

import static java.util.stream.Collectors.groupingBy;
import static java.util.stream.Collectors.mapping;
import static java.util.stream.Collectors.toList;

import com.poudy.common.persistence.SnapshotReader;
import com.poudy.exception.InfrastructureException;
import com.poudy.excludecode.domain.ExcludeCodeIngredients;
import com.poudy.excludecode.domain.ExcludeCodeMapping;
import com.poudy.excludecode.domain.InvalidExcludeCodeDefinitionException;
import com.poudy.ingredient.domain.ExcludeCode;
import com.poudy.ingredient.repository.IngredientRepository;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Repository;

@Repository
public class ExcludeCodeRepository {

    private final ExcludeCodeIngredients excludeCodeIngredients;
    private final ExcludeCodeJpaRepository excludeCodeJpaRepository;

    public ExcludeCodeRepository(
        ExcludeCodeJpaRepository excludeCodeJpaRepository,
        IngredientRepository ingredientRepository,
        SnapshotReader snapshotReader
    ) {
        this.excludeCodeJpaRepository = excludeCodeJpaRepository;
        Map<ExcludeCode, List<Long>> ingredientIds = snapshotReader.read(excludeCodeJpaRepository::findAllMappings)
            .stream()
            .map(ExcludeCodeIngredientEntity::id)
            .collect(
                groupingBy(
                    ExcludeCodeIngredientId::excludeCode,
                    () -> new EnumMap<>(ExcludeCode.class),
                    mapping(ExcludeCodeIngredientId::ingredientId, toList())
                )
            );
        List<ExcludeCodeMapping> mappings = ingredientIds.entrySet().stream()
            .map(entry -> new ExcludeCodeMapping(entry.getKey(), entry.getValue()))
            .toList();
        try {
            this.excludeCodeIngredients = ExcludeCodeIngredients.from(mappings, ingredientRepository.findAll());
        } catch (InvalidExcludeCodeDefinitionException exception) {
            throw new InfrastructureException(exception.getMessage(), exception);
        }
    }

    public ExcludeCodeIngredients findAll() {
        return excludeCodeIngredients;
    }

    public List<ExcludeCode> codesOf(Long ingredientId) {
        return excludeCodeJpaRepository.findCodesByIngredientId(ingredientId).stream().sorted().toList();
    }
}
