package com.poudy.excludecode.repository;

import static java.util.stream.Collectors.groupingBy;
import static java.util.stream.Collectors.mapping;
import static java.util.stream.Collectors.toList;

import com.poudy.common.persistence.SnapshotReader;
import com.poudy.exception.InfrastructureException;
import com.poudy.excludecode.domain.ExcludeCodeIngredients;
import com.poudy.excludecode.domain.InvalidExcludeCodeDefinitionException;
import com.poudy.ingredient.domain.ExcludeCode;
import com.poudy.ingredient.repository.IngredientRepository;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class ExcludeCodeRepository {

    private static final String MAPPINGS_QUERY = "select exclude_code, ingredient_id from exclude_code_ingredient"
        + " order by exclude_code, display_order";

    private final ExcludeCodeIngredients excludeCodeIngredients;

    public ExcludeCodeRepository(
        JdbcTemplate jdbcTemplate,
        IngredientRepository ingredientRepository,
        SnapshotReader snapshotReader
    ) {
        Map<ExcludeCode, List<Long>> ingredientIds = snapshotReader.read(() -> findAllMappings(jdbcTemplate))
            .stream()
            .collect(
                groupingBy(
                    MappingRow::excludeCode,
                    () -> new EnumMap<>(ExcludeCode.class),
                    mapping(MappingRow::ingredientId, toList())
                )
            );
        try {
            this.excludeCodeIngredients = ExcludeCodeIngredients.from(ingredientIds, ingredientRepository.findAll());
        } catch (InvalidExcludeCodeDefinitionException exception) {
            throw new InfrastructureException(exception.getMessage(), exception);
        }
    }

    private static List<MappingRow> findAllMappings(JdbcTemplate jdbcTemplate) {
        return jdbcTemplate.query(
            MAPPINGS_QUERY,
            (row, rowNumber) -> new MappingRow(
                ExcludeCode.valueOf(row.getString("exclude_code")),
                row.getLong("ingredient_id")
            )
        );
    }

    public ExcludeCodeIngredients findAll() {
        return excludeCodeIngredients;
    }

    private record MappingRow(ExcludeCode excludeCode, Long ingredientId) {
    }
}
