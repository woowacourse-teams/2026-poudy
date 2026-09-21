package com.poudy.excludecode.repository;

import static java.util.stream.Collectors.groupingBy;
import static java.util.stream.Collectors.mapping;
import static java.util.stream.Collectors.toList;

import com.poudy.exception.InfrastructureException;
import com.poudy.excludecode.domain.ExcludeCodeIngredients;
import com.poudy.excludecode.domain.ExcludeCodeMapping;
import com.poudy.excludecode.domain.InvalidExcludeCodeDefinitionException;
import com.poudy.ingredient.domain.ExcludeCode;
import com.poudy.ingredient.repository.IngredientRepository;
import jakarta.annotation.PostConstruct;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

@Repository
@Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
public class ExcludeCodeRepository {

    private final IngredientRepository ingredientRepository;
    private final ExcludeCodeJpaRepository excludeCodeJpaRepository;

    public ExcludeCodeRepository(
        ExcludeCodeJpaRepository excludeCodeJpaRepository,
        IngredientRepository ingredientRepository
    ) {
        this.excludeCodeJpaRepository = excludeCodeJpaRepository;
        this.ingredientRepository = ingredientRepository;
    }

    public ExcludeCodeIngredients findAll() {
        Map<ExcludeCode, List<Long>> ingredientIds = excludeCodeJpaRepository.findAllMappings()
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
            return ExcludeCodeIngredients.from(
                mappings,
                ingredientRepository
                    .findByIds(ingredientIds.values().stream().flatMap(List::stream).distinct().toList())
            );
        } catch (InvalidExcludeCodeDefinitionException exception) {
            throw new InfrastructureException(exception.getMessage(), exception);
        }
    }

    @PostConstruct
    void validateDefinitions() {
        if (!excludeCodeJpaRepository.findDefinedCodes().containsAll(List.of(ExcludeCode.values()))) {
            throw new InfrastructureException("제외 성분군에 속한 성분이 없는 정의가 있습니다.");
        }
    }

    public List<ExcludeCode> codesOf(Long ingredientId) {
        return excludeCodeJpaRepository.findCodesByIngredientId(ingredientId).stream().sorted().toList();
    }

    public List<ExcludeCode> freeCodesOf(List<Long> ingredientIds) {
        List<ExcludeCode> contained = ingredientIds.isEmpty() ? List.of()
            : excludeCodeJpaRepository.findCodesByIngredientIds(ingredientIds);
        return java.util.Arrays.stream(ExcludeCode.values()).filter(code -> !contained.contains(code)).toList();
    }
}
