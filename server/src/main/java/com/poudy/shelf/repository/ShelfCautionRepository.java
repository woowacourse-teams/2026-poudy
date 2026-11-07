package com.poudy.shelf.repository;

import com.poudy.exception.InfrastructureException;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.support.SqlArrayValue;
import org.springframework.stereotype.Repository;

@Repository
public class ShelfCautionRepository {

    private final NamedParameterJdbcTemplate jdbc;

    public ShelfCautionRepository(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public Map<String, Set<Long>> findIngredientIdsByGroup(List<String> groupCodes) {
        if (groupCodes.isEmpty()) {
            return Map.of();
        }
        MapSqlParameterSource parameters = new MapSqlParameterSource(
            "groupCodes",
            new SqlArrayValue("text", groupCodes.toArray())
        );
        validateGroups(parameters);
        Map<String, Set<Long>> groupIngredients = new HashMap<>();
        jdbc.query(
            "select group_code, ingredient_id from ingredient_group_ingredient where group_code = any(:groupCodes)",
            parameters,
            row -> {
                groupIngredients.computeIfAbsent(row.getString("group_code"), code -> new HashSet<>())
                    .add(row.getLong("ingredient_id"));
            }
        );
        return groupIngredients.entrySet().stream()
            .collect(Collectors.toUnmodifiableMap(Map.Entry::getKey, entry -> Set.copyOf(entry.getValue())));
    }

    private void validateGroups(MapSqlParameterSource parameters) {
        List<String> missing = jdbc.queryForList(
            """
                select requested.code from unnest(cast(:groupCodes as text[])) as requested(code)
                where not exists (select 1 from ingredient_group g where g.code = requested.code)
                order by requested.code
                """,
            parameters,
            String.class
        );
        if (!missing.isEmpty()) {
            throw new InfrastructureException("파우치 주의 성분군이 DB에 없습니다: " + missing);
        }
    }
}
