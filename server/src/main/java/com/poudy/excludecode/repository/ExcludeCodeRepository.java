package com.poudy.excludecode.repository;

import static java.util.stream.Collectors.groupingBy;

import com.poudy.exception.InfrastructureException;
import com.poudy.excludecode.domain.ExcludeCode;
import com.poudy.excludecode.domain.ExcludeCodeGroup;
import com.poudy.excludecode.domain.ExcludeCodeIngredient;
import com.poudy.excludecode.domain.ExcludeCodes;
import com.poudy.excludecode.domain.InvalidExcludeCodeDefinitionException;
import jakarta.annotation.PostConstruct;
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
            "select code, display_name, description from exclude_code order by code",
            new MapSqlParameterSource(),
            (row, number) -> new GroupRow(
                new ExcludeCode(row.getString("code")),
                row.getString("display_name"),
                row.getString("description")
            )
        );
        try {
            Map<ExcludeCode, List<ExcludeCodeIngredient>> members = jdbc.query(
                "select e.exclude_code, e.ingredient_id, i.korean_name, i.english_name"
                    + " from exclude_code_ingredient e join ingredient i on i.id = e.ingredient_id"
                    + " order by e.exclude_code, e.display_order",
                new MapSqlParameterSource(),
                (row, number) -> {
                    ExcludeCode code = new ExcludeCode(row.getString("exclude_code"));
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

    @PostConstruct
    void validateDefinitions() {
        Long definitionCount = jdbc.queryForObject(
            "select count(*) from exclude_code",
            new MapSqlParameterSource(),
            Long.class
        );
        if (definitionCount == null || definitionCount == 0) {
            throw new InfrastructureException("제외 성분군 정의를 찾지 못했습니다.");
        }
        List<String> missing = jdbc.queryForList(
            "select c.code from exclude_code c left join exclude_code_ingredient i on i.exclude_code = c.code"
                + " where i.exclude_code is null order by c.code",
            new MapSqlParameterSource(),
            String.class
        );
        if (!missing.isEmpty()) {
            throw new InfrastructureException("제외 성분군에 속한 성분이 없는 정의가 있습니다: " + missing);
        }
    }

    public List<ExcludeCode> codesOf(Long ingredientId) {
        return jdbc.queryForList(
            "select distinct exclude_code from exclude_code_ingredient where ingredient_id = :id order by exclude_code",
            Map.of("id", ingredientId),
            String.class
        ).stream().map(ExcludeCode::new).toList();
    }

    public boolean containsAll(List<ExcludeCode> codes) {
        if (codes.isEmpty()) {
            return true;
        }
        Long count = jdbc.queryForObject(
            "select count(*) from exclude_code where code = any(cast(:codes as text[]))",
            new MapSqlParameterSource(
                "codes",
                new SqlArrayValue("text", codes.stream().map(ExcludeCode::value).toArray())
            ),
            Long.class
        );
        return count != null && count == codes.size();
    }

    private record MappingRow(ExcludeCode code, ExcludeCodeIngredient ingredient) {
    }

    private record GroupRow(ExcludeCode code, String displayName, String description) {
    }
}
