package com.poudy.myfilter.repository;

import java.util.List;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.support.SqlArrayValue;
import org.springframework.stereotype.Repository;

@Repository
public class MyFilterRepository {

    private final NamedParameterJdbcTemplate jdbc;

    public MyFilterRepository(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public List<Long> findIngredientIds(long userId) {
        return jdbc.queryForList(
            """
                select ingredient_id
                from user_my_filter_ingredient
                where user_id = :userId
                order by created_at desc, ingredient_id asc
                """,
            new MapSqlParameterSource("userId", userId),
            Long.class
        );
    }

    public void add(long userId, List<Long> ingredientIds) {
        jdbc.update(
            """
                insert into user_my_filter_ingredient (user_id, ingredient_id)
                select :userId, ingredient_id
                from unnest(cast(:ingredientIds as bigint[])) as ingredient_id
                on conflict (user_id, ingredient_id) do nothing
                """,
            filterIngredientParameters(userId, ingredientIds)
        );
    }

    public void remove(long userId, List<Long> ingredientIds) {
        jdbc.update(
            """
                delete from user_my_filter_ingredient
                where user_id = :userId and ingredient_id = any(cast(:ingredientIds as bigint[]))
                """,
            filterIngredientParameters(userId, ingredientIds)
        );
    }

    private MapSqlParameterSource filterIngredientParameters(long userId, List<Long> ingredientIds) {
        return new MapSqlParameterSource()
            .addValue("userId", userId)
            .addValue("ingredientIds", new SqlArrayValue("bigint", ingredientIds.toArray()));
    }
}
