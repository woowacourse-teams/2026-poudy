package com.poudy.skinfilter.repository;

import java.util.List;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.support.SqlArrayValue;
import org.springframework.stereotype.Repository;

@Repository
public class SkinFilterRepository {

    private final NamedParameterJdbcTemplate jdbc;

    public SkinFilterRepository(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public List<Long> findIngredientIds(long memberId) {
        return jdbc.queryForList(
            """
                select ingredient_id
                from user_skin_filter_ingredient
                where user_id = :memberId
                order by created_at desc, ingredient_id asc
                """,
            new MapSqlParameterSource("memberId", memberId),
            Long.class
        );
    }

    public void add(long memberId, List<Long> ingredientIds) {
        jdbc.update(
            """
                insert into user_skin_filter_ingredient (user_id, ingredient_id)
                select :memberId, ingredient_id
                from unnest(cast(:ingredientIds as bigint[])) as ingredient_id
                on conflict (user_id, ingredient_id) do nothing
                """,
            filterIngredientParameters(memberId, ingredientIds)
        );
    }

    public void remove(long memberId, List<Long> ingredientIds) {
        jdbc.update(
            """
                delete from user_skin_filter_ingredient
                where user_id = :memberId and ingredient_id = any(cast(:ingredientIds as bigint[]))
                """,
            filterIngredientParameters(memberId, ingredientIds)
        );
    }

    private MapSqlParameterSource filterIngredientParameters(long memberId, List<Long> ingredientIds) {
        return new MapSqlParameterSource()
            .addValue("memberId", memberId)
            .addValue("ingredientIds", new SqlArrayValue("bigint", ingredientIds.toArray()));
    }
}
