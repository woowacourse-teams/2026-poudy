package com.poudy.shelf.repository;

import com.poudy.exception.InfrastructureException;
import java.util.List;
import java.util.Set;
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

    public Set<Long> findGroupIngredientIds(List<String> groupCodes) {
        if (groupCodes.isEmpty()) {
            return Set.of();
        }
        MapSqlParameterSource parameters = new MapSqlParameterSource(
            "groupCodes",
            new SqlArrayValue("text", groupCodes.toArray())
        );
        validateGroups(parameters);
        return Set.copyOf(
            jdbc.queryForList(
                "select distinct ingredient_id from ingredient_group_ingredient where group_code = any(:groupCodes)",
                parameters,
                Long.class
            )
        );
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
            throw new InfrastructureException("선반 주의 성분군이 DB에 없습니다: " + missing);
        }
    }
}
