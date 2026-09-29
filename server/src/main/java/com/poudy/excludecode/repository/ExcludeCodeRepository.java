package com.poudy.excludecode.repository;

import static java.util.stream.Collectors.groupingBy;

import com.poudy.exception.InfrastructureException;
import com.poudy.excludecode.domain.ExcludeCode;
import com.poudy.excludecode.domain.ExcludeCodeGroup;
import com.poudy.excludecode.domain.ExcludeCodeIngredient;
import com.poudy.excludecode.domain.ExcludeCodes;
import com.poudy.excludecode.domain.InvalidExcludeCodeDefinitionException;
import java.util.LinkedHashMap;
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

    private final NamedParameterJdbcTemplate jdbc;
    public ExcludeCodeRepository(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public ExcludeCodes findAll() {
        List<GroupRow> definitions = jdbc.query(
            "select code, display_name, description from ingredient_group"
                + " where code = any(:codes) order by code",
            excludeCodeParameters(),
            (row, number) -> new GroupRow(
                ExcludeCode.valueOf(row.getString("code")),
                row.getString("display_name"),
                row.getString("description")
            )
        );
        try {
            Map<ExcludeCode, List<ExcludeCodeIngredient>> members = jdbc.query(
                "select e.group_code, e.ingredient_id, i.korean_name, i.english_name"
                    + " from ingredient_group_ingredient e join ingredient i on i.id = e.ingredient_id"
                    + " where e.group_code = any(:codes)"
                    + " order by e.group_code, e.display_order",
                excludeCodeParameters(),
                (row, number) -> {
                    ExcludeCode code = ExcludeCode.valueOf(row.getString("group_code"));
                    Long id = row.getLong("ingredient_id");
                    return new MappingRow(
                        code,
                        new ExcludeCodeIngredient(
                            id,
                            row.getString("korean_name"),
                            row.getString("english_name")
                        )
                    );
                }
            ).stream().collect(
                groupingBy(
                    MappingRow::code,
                    LinkedHashMap::new,
                    java.util.stream.Collectors.mapping(MappingRow::ingredient, java.util.stream.Collectors.toList())
                )
            );
            List<ExcludeCodeGroup> groups = definitions.stream()
                .map(
                    definition -> new ExcludeCodeGroup(
                        definition.code(),
                        definition.displayName(),
                        definition.description(),
                        members.getOrDefault(definition.code(), List.of())
                    )
                )
                .toList();
            return new ExcludeCodes(groups);
        } catch (InvalidExcludeCodeDefinitionException exception) {
            throw new InfrastructureException(exception.getMessage(), exception);
        }
    }

    private void validateDefinitions() {
        List<String> missing = jdbc.queryForList(
            "select code from unnest(cast(:codes as text[])) as code"
                + " where not exists (select 1 from ingredient_group_ingredient i where i.group_code = code)"
                + " order by code",
            excludeCodeParameters(),
            String.class
        );
        if (!missing.isEmpty()) {
            throw new InfrastructureException("성분이 등록되지 않은 제외 성분군이 있습니다: " + missing);
        }
    }

    public List<ExcludeCode> codesOf(Long ingredientId) {
        validateDefinitions();
        return jdbc.queryForList(
            "select distinct group_code from ingredient_group_ingredient"
                + " where ingredient_id = :id and group_code = any(:codes) order by group_code",
            excludeCodeParameters().addValue("id", ingredientId),
            String.class
        ).stream().map(ExcludeCode::valueOf).toList();
    }

    private static MapSqlParameterSource excludeCodeParameters() {
        return new MapSqlParameterSource("codes", new SqlArrayValue("text", ExcludeCode.codeValues().toArray()));
    }

    private record MappingRow(ExcludeCode code, ExcludeCodeIngredient ingredient) {
    }

    private record GroupRow(ExcludeCode code, String displayName, String description) {
    }
}
