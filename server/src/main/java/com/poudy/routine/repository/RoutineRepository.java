package com.poudy.routine.repository;

import com.poudy.routine.domain.Routine;
import com.poudy.routine.domain.RoutineMemo;
import com.poudy.routine.domain.RoutineName;
import com.poudy.routine.domain.RoutineProducts;
import com.poudy.routine.domain.SharedRoutine;
import com.poudy.routine.domain.SharedRoutinePage;
import com.poudy.routine.domain.TimeOfDay;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.stream.IntStream;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.core.namedparam.SqlParameterSource;
import org.springframework.jdbc.support.SqlArrayValue;
import org.springframework.stereotype.Repository;

@Repository
public class RoutineRepository {

    private static final String SHARED_ROUTINES = """
        select r.id, r.name, null as memo, r.is_public, u.nickname, u.profile_image_id
        from routine r
        join "user" u on u.id = r.user_id and u.deleted_at is null
        where r.is_public
        """;
    private static final String HAS_PRODUCTS = """
        and exists(select 1 from routine_product rp where rp.routine_id = r.id)
        """;

    private final NamedParameterJdbcTemplate jdbc;

    public RoutineRepository(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public long save(long userId, RoutineName name, RoutineMemo memo, boolean isPublic, RoutineProducts products) {
        Long routineId = jdbc.queryForObject(
            """
                insert into routine (user_id, name, memo, is_public)
                values (:userId, :name, :memo, :isPublic)
                returning id
                """,
            new MapSqlParameterSource()
                .addValue("userId", userId)
                .addValue("name", name.value())
                .addValue("memo", memo.value())
                .addValue("isPublic", isPublic),
            Long.class
        );
        Arrays.stream(TimeOfDay.values())
            .forEach(timeOfDay -> saveProducts(routineId, timeOfDay, products.at(timeOfDay)));
        return routineId;
    }

    public List<Routine> findAllByUserId(long userId) {
        List<RoutineRow> rows = jdbc.query(
            """
                select id, name, memo, is_public
                from routine
                where user_id = :userId
                order by created_at desc, id desc
                """,
            new MapSqlParameterSource("userId", userId),
            (resultSet, rowNumber) -> RoutineRow.from(resultSet)
        );
        Map<Long, RoutineProducts> products = findProducts(rows.stream().map(RoutineRow::id).toList());
        return rows.stream().map(row -> row.toRoutine(products.get(row.id()))).toList();
    }

    public Optional<Routine> findByIdAndUserId(long routineId, long userId) {
        return jdbc.query(
            """
                select id, name, memo, is_public
                from routine
                where id = :routineId and user_id = :userId
                """,
            parameters(routineId, userId),
            (resultSet, rowNumber) -> RoutineRow.from(resultSet)
        )
            .stream()
            .findFirst()
            .map(row -> row.toRoutine(findProducts(List.of(row.id())).get(row.id())));
    }

    public Optional<SharedRoutine> findShared(long routineId) {
        return findShared(SHARED_ROUTINES + " and r.id = :routineId", new MapSqlParameterSource("routineId", routineId))
            .stream()
            .findFirst();
    }

    public SharedRoutinePage findSharedPage(int page, int size) {
        List<SharedRoutine> routines = findShared(
            SHARED_ROUTINES + HAS_PRODUCTS + " order by r.created_at desc, r.id desc limit :limit offset :offset",
            new MapSqlParameterSource()
                .addValue("limit", size)
                .addValue("offset", (long) (page - 1) * size)
        );
        Long total = jdbc.queryForObject(
            "select count(*) from (" + SHARED_ROUTINES + HAS_PRODUCTS + ") shared",
            new MapSqlParameterSource(),
            Long.class
        );
        return new SharedRoutinePage(routines, total);
    }

    public long saveCopy(long userId, RoutineName name, long sourceRoutineId) {
        Long routineId = jdbc.queryForObject(
            """
                insert into routine (user_id, name)
                values (:userId, :name)
                returning id
                """,
            new MapSqlParameterSource()
                .addValue("userId", userId)
                .addValue("name", name.value()),
            Long.class
        );
        jdbc.update(
            """
                insert into routine_product (routine_id, time_of_day, product_id, display_order)
                select :routineId, time_of_day, product_id, display_order
                from routine_product
                where routine_id = :sourceRoutineId
                """,
            new MapSqlParameterSource()
                .addValue("routineId", routineId)
                .addValue("sourceRoutineId", sourceRoutineId)
        );
        return routineId;
    }

    private List<SharedRoutine> findShared(String sql, MapSqlParameterSource parameters) {
        List<SharedRoutineRow> rows = jdbc.query(
            sql,
            parameters,
            (resultSet, rowNumber) -> new SharedRoutineRow(
                RoutineRow.from(resultSet),
                resultSet.getString("nickname"),
                resultSet.getObject("profile_image_id", UUID.class)
            )
        );
        Map<Long, RoutineProducts> products = findProducts(rows.stream().map(row -> row.routine().id()).toList());
        return rows.stream().map(row -> row.toSharedRoutine(products.get(row.routine().id()))).toList();
    }

    public boolean update(long routineId, long userId, RoutineName name, RoutineMemo memo, boolean isPublic) {
        return jdbc.update(
            """
                update routine
                set name = :name, memo = :memo, is_public = :isPublic, updated_at = (now() AT TIME ZONE 'Asia/Seoul')
                where id = :routineId and user_id = :userId
                """,
            parameters(routineId, userId)
                .addValue("name", name.value())
                .addValue("memo", memo.value())
                .addValue("isPublic", isPublic)
        ) == 1;
    }

    public boolean lock(long routineId, long userId) {
        return !jdbc.queryForList(
            "select id from routine where id = :routineId and user_id = :userId for no key update",
            parameters(routineId, userId),
            Long.class
        ).isEmpty();
    }

    public void replaceProducts(long routineId, RoutineProducts products) {
        MapSqlParameterSource routine = new MapSqlParameterSource("routineId", routineId);
        jdbc.update("delete from routine_product where routine_id = :routineId", routine);
        Arrays.stream(TimeOfDay.values())
            .forEach(timeOfDay -> saveProducts(routineId, timeOfDay, products.at(timeOfDay)));
        jdbc.update(
            "update routine set updated_at = (now() AT TIME ZONE 'Asia/Seoul') where id = :routineId",
            routine
        );
    }

    public boolean delete(long routineId, long userId) {
        return jdbc.update(
            "delete from routine where id = :routineId and user_id = :userId",
            parameters(routineId, userId)
        ) == 1;
    }

    private void saveProducts(long routineId, TimeOfDay timeOfDay, List<Long> productIds) {
        SqlParameterSource[] batch = IntStream.range(0, productIds.size())
            .mapToObj(
                index -> new MapSqlParameterSource()
                    .addValue("routineId", routineId)
                    .addValue("timeOfDay", timeOfDay.name())
                    .addValue("productId", productIds.get(index))
                    .addValue("displayOrder", index + 1)
            )
            .toArray(SqlParameterSource[]::new);
        jdbc.batchUpdate(
            """
                insert into routine_product (routine_id, time_of_day, product_id, display_order)
                values (:routineId, :timeOfDay, :productId, :displayOrder)
                """,
            batch
        );
    }

    private Map<Long, RoutineProducts> findProducts(List<Long> routineIds) {
        List<RoutineProductRow> rows = jdbc.query(
            """
                select routine_id, time_of_day, product_id
                from routine_product
                where routine_id = any(:routineIds)
                order by routine_id, time_of_day, display_order
                """,
            new MapSqlParameterSource("routineIds", new SqlArrayValue("bigint", routineIds.toArray())),
            (resultSet, rowNumber) -> new RoutineProductRow(
                resultSet.getLong("routine_id"),
                TimeOfDay.valueOf(resultSet.getString("time_of_day")),
                resultSet.getLong("product_id")
            )
        );
        Map<Long, List<RoutineProductRow>> byRoutine = rows.stream()
            .collect(Collectors.groupingBy(RoutineProductRow::routineId));
        return routineIds.stream()
            .collect(
                Collectors.toMap(
                    routineId -> routineId,
                    routineId -> RoutineProductRow.toProducts(byRoutine.getOrDefault(routineId, List.of()))
                )
            );
    }

    private MapSqlParameterSource parameters(long routineId, long userId) {
        return new MapSqlParameterSource()
            .addValue("routineId", routineId)
            .addValue("userId", userId);
    }

    private record RoutineRow(long id, String name, String memo, boolean isPublic) {

        private static RoutineRow from(ResultSet resultSet) throws SQLException {
            return new RoutineRow(
                resultSet.getLong("id"),
                resultSet.getString("name"),
                resultSet.getString("memo"),
                resultSet.getBoolean("is_public")
            );
        }

        private Routine toRoutine(RoutineProducts products) {
            return new Routine(id, new RoutineName(name), new RoutineMemo(memo), isPublic, products);
        }
    }

    private record SharedRoutineRow(RoutineRow routine, String authorNickname, UUID authorProfileImageId) {

        private SharedRoutine toSharedRoutine(RoutineProducts products) {
            return new SharedRoutine(routine.toRoutine(products), authorNickname, authorProfileImageId);
        }
    }

    private record RoutineProductRow(long routineId, TimeOfDay timeOfDay, long productId) {

        private static RoutineProducts toProducts(List<RoutineProductRow> rows) {
            return new RoutineProducts(productIdsAt(rows, TimeOfDay.MORNING), productIdsAt(rows, TimeOfDay.EVENING));
        }

        private static List<Long> productIdsAt(List<RoutineProductRow> rows, TimeOfDay timeOfDay) {
            return rows.stream().filter(row -> row.timeOfDay() == timeOfDay).map(RoutineProductRow::productId).toList();
        }
    }
}
