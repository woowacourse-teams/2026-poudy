package com.poudy.excludecode.repository;

import static java.util.stream.Collectors.groupingBy;
import static java.util.stream.Collectors.mapping;
import static java.util.stream.Collectors.toList;

import com.poudy.exception.InfrastructureException;
import com.poudy.excludecode.domain.ExcludeCodeIngredients;
import com.poudy.excludecode.domain.InvalidExcludeCodeDefinitionException;
import com.poudy.ingredient.domain.ExcludeCode;
import com.poudy.ingredient.repository.IngredientRepository;
import jakarta.annotation.PostConstruct;
import java.util.Arrays;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.support.SqlArrayValue;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

@Repository
@Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
public class ExcludeCodeRepository {

    private static final String MAPPINGS_QUERY = "select exclude_code, ingredient_id from exclude_code_ingredient"
        + " order by exclude_code, display_order";

    private final NamedParameterJdbcTemplate jdbc;
    private final IngredientRepository ingredientRepository;

    public ExcludeCodeRepository(NamedParameterJdbcTemplate jdbc, IngredientRepository ingredientRepository) {
        this.jdbc = jdbc;
        this.ingredientRepository = ingredientRepository;
    }

    public ExcludeCodeIngredients findAll() {
        Map<ExcludeCode, List<Long>> ingredientIds = mappings(MAPPINGS_QUERY, new MapSqlParameterSource())
            .stream()
            .collect(
                groupingBy(
                    MappingRow::excludeCode,
                    () -> new EnumMap<>(ExcludeCode.class),
                    mapping(MappingRow::ingredientId, toList())
                )
            );
        try {
            return ExcludeCodeIngredients.from(
                ingredientIds,
                ingredientRepository.findByIds(
                    ingredientIds.values().stream().flatMap(List::stream).distinct().toList()
                )
            );
        } catch (InvalidExcludeCodeDefinitionException exception) {
            throw new InfrastructureException(exception.getMessage(), exception);
        }
    }

    @PostConstruct
    void validateDefinitions() {
        List<ExcludeCode> defined = jdbc.queryForList(
            "select distinct exclude_code from exclude_code_ingredient",
            new MapSqlParameterSource(),
            String.class
        ).stream().map(ExcludeCode::valueOf).toList();
        if (!defined.containsAll(List.of(ExcludeCode.values()))) {
            throw new InfrastructureException("제외 성분군에 속한 성분이 없는 정의가 있습니다.");
        }
    }

    public List<ExcludeCode> codesOf(Long ingredientId) {
        return jdbc.queryForList(
            "select distinct exclude_code from exclude_code_ingredient where ingredient_id = :id",
            Map.of("id", ingredientId),
            String.class
        ).stream().map(ExcludeCode::valueOf).sorted().toList();
    }

    public List<ExcludeCode> freeCodesOf(List<Long> ingredientIds) {
        if (ingredientIds.isEmpty()) {
            return List.of(ExcludeCode.values());
        }
        MapSqlParameterSource parameters = new MapSqlParameterSource(
            "ids",
            new SqlArrayValue("bigint", ingredientIds.toArray())
        );
        List<ExcludeCode> contained = jdbc.queryForList(
            "select distinct exclude_code from exclude_code_ingredient"
                + " where ingredient_id = any(cast(:ids as bigint[]))",
            parameters,
            String.class
        ).stream().map(ExcludeCode::valueOf).toList();
        return Arrays.stream(ExcludeCode.values()).filter(code -> !contained.contains(code)).toList();
    }

    private List<MappingRow> mappings(String sql, MapSqlParameterSource parameters) {
        return jdbc.query(
            sql,
            parameters,
            (row, rowNumber) -> new MappingRow(
                ExcludeCode.valueOf(row.getString("exclude_code")),
                row.getLong("ingredient_id")
            )
        );
    }

    private record MappingRow(ExcludeCode excludeCode, Long ingredientId) {
    }
}
