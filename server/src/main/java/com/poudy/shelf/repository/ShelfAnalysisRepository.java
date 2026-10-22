package com.poudy.shelf.repository;

import com.poudy.shelf.domain.AnalysisSnapshot;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.support.SqlArrayValue;
import org.springframework.stereotype.Repository;

@Repository
public class ShelfAnalysisRepository {

    private final NamedParameterJdbcTemplate jdbc;

    public ShelfAnalysisRepository(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public AnalysisSnapshot find(long userId) {
        Map<Long, Boolean> newByIngredientId = new LinkedHashMap<>();
        jdbc.query(
            "select ingredient_id, is_new from user_shelf_analysis_ingredient where user_id = :userId",
            new MapSqlParameterSource("userId", userId),
            rs -> {
                newByIngredientId.put(rs.getLong("ingredient_id"), rs.getBoolean("is_new"));
            }
        );
        return new AnalysisSnapshot(newByIngredientId);
    }

    // 같은 회원의 요청이 겹쳐도 키 충돌로 실패하지 않게 새 결과에 없는 행만 지우고 나머지는 덮어쓴다.
    public void save(long userId, AnalysisSnapshot snapshot) {
        Map<Long, Boolean> newByIngredientId = snapshot.newByIngredientId();
        jdbc.update(
            "delete from user_shelf_analysis_ingredient where user_id = :userId and ingredient_id <> all(:ingredientIds)",
            new MapSqlParameterSource()
                .addValue("userId", userId)
                .addValue("ingredientIds", new SqlArrayValue("bigint", newByIngredientId.keySet().toArray()))
        );
        jdbc.batchUpdate(
            """
                insert into user_shelf_analysis_ingredient (user_id, ingredient_id, is_new)
                values (:userId, :ingredientId, :isNew)
                on conflict (user_id, ingredient_id) do update
                set is_new = excluded.is_new, updated_at = (now() at time zone 'Asia/Seoul')
                """,
            newByIngredientId.entrySet().stream()
                .map(
                    entry -> new MapSqlParameterSource()
                        .addValue("userId", userId)
                        .addValue("ingredientId", entry.getKey())
                        .addValue("isNew", entry.getValue())
                )
                .toArray(MapSqlParameterSource[]::new)
        );
    }
}
