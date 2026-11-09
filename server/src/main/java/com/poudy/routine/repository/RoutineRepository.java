package com.poudy.routine.repository;

import com.poudy.routine.domain.Routine;
import com.poudy.routine.domain.RoutineAuthor;
import com.poudy.routine.domain.RoutineComment;
import com.poudy.routine.domain.RoutineCommentAuthor;
import com.poudy.routine.domain.RoutineCommentContent;
import com.poudy.routine.domain.RoutineCommentPage;
import com.poudy.routine.domain.RoutineMemo;
import com.poudy.routine.domain.RoutineName;
import com.poudy.routine.domain.RoutinePage;
import com.poudy.routine.domain.RoutineProducts;
import com.poudy.routine.domain.RoutineReactions;
import com.poudy.routine.domain.SharedRoutine;
import com.poudy.routine.domain.SharedRoutinePage;
import com.poudy.routine.domain.SharedRoutineSort;
import com.poudy.routine.domain.SharedRoutines;
import com.poudy.routine.domain.TimeOfDay;
import com.poudy.skintype.domain.SkinType;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDateTime;
import java.time.ZoneId;
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

    private static final String REACTION_COUNTS = """
        (select count(*) from routine_like l
            join "user" lu on lu.id = l.user_id and lu.deleted_at is null
            where l.routine_id = r.id) as like_count,
        (select count(*) from routine_comment c
            join "user" cu on cu.id = c.user_id and cu.deleted_at is null
            where c.routine_id = r.id) as comment_count
        """;
    private static final String SHARED_ROUTINES = """
        select r.id, r.name, r.memo, r.is_public, u.nickname, u.profile_image_id, u.skin_type,
        """ + REACTION_COUNTS + """
        from routine r
        join "user" u on u.id = r.user_id and u.deleted_at is null
        where r.is_public
        """;
    private static final String COMMENT_COLUMNS = """
        select c.id, c.content, c.created_at, c.user_id, r.user_id as routine_user_id, u.nickname, u.profile_image_id,
            u.skin_type
        from routine_comment c
        join routine r on r.id = c.routine_id
        join "user" u on u.id = c.user_id and u.deleted_at is null
        """;
    private static final String COMMENTS = COMMENT_COLUMNS + " where c.routine_id = :routineId";
    private static final String COMMENTS_BY_ID = COMMENT_COLUMNS + " where c.id = :commentId";
    private static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");
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

    public RoutinePage findPageByUserId(long userId, int page, int size) {
        List<RoutineRow> rows = jdbc.query(
            """
                select id, name, memo, is_public
                from routine
                where user_id = :userId
                order by created_at desc, id desc
                limit :limit offset :offset
                """,
            new MapSqlParameterSource()
                .addValue("userId", userId)
                .addValue("limit", size)
                .addValue("offset", (long) (page - 1) * size),
            (resultSet, rowNumber) -> RoutineRow.from(resultSet)
        );
        Map<Long, RoutineProducts> products = findProducts(rows.stream().map(RoutineRow::id).toList());
        Long total = jdbc.queryForObject(
            "select count(*) from routine where user_id = :userId",
            new MapSqlParameterSource("userId", userId),
            Long.class
        );
        return new RoutinePage(
            rows.stream().map(row -> row.toRoutine(products.get(row.id()))).toList(),
            findReactions(rows.stream().map(RoutineRow::id).toList()),
            total
        );
    }

    public boolean existsByIdAndUserId(long routineId, long userId) {
        return Boolean.TRUE.equals(
            jdbc.queryForObject(
                "select exists(select 1 from routine where id = :routineId and user_id = :userId)",
                parameters(routineId, userId),
                Boolean.class
            )
        );
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

    public SharedRoutinePage findSharedPage(SharedRoutineSort sort, int page, int size) {
        List<SharedRoutine> routines = findShared(
            SHARED_ROUTINES + HAS_PRODUCTS + " order by " + orderOf(sort) + " limit :limit offset :offset",
            new MapSqlParameterSource()
                .addValue("limit", size)
                .addValue("offset", (long) (page - 1) * size)
        );
        Long total = jdbc.queryForObject(
            "select count(*) from (" + SHARED_ROUTINES + HAS_PRODUCTS + ") shared",
            new MapSqlParameterSource(),
            Long.class
        );
        return new SharedRoutinePage(new SharedRoutines(routines), total);
    }

    public SharedRoutines findMostLikedContaining(long productId, int limit) {
        List<SharedRoutine> routines = findShared(
            SHARED_ROUTINES + """
                and exists(select 1 from routine_product rp where rp.routine_id = r.id and rp.product_id = :productId)
                """ + " order by " + orderOf(SharedRoutineSort.LIKES) + " limit :limit",
            new MapSqlParameterSource()
                .addValue("productId", productId)
                .addValue("limit", limit)
        );
        return new SharedRoutines(routines);
    }

    public long saveCopy(long userId, RoutineName name, long sourceRoutineId) {
        Long routineId = jdbc.queryForObject(
            """
                insert into routine (user_id, name, memo)
                select :userId, :name, memo
                from routine
                where id = :sourceRoutineId
                returning id
                """,
            new MapSqlParameterSource()
                .addValue("userId", userId)
                .addValue("name", name.value())
                .addValue("sourceRoutineId", sourceRoutineId),
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

    public boolean existsShared(long routineId) {
        return Boolean.TRUE.equals(
            jdbc.queryForObject(
                "select exists(" + SHARED_ROUTINES + " and r.id = :routineId)",
                new MapSqlParameterSource("routineId", routineId),
                Boolean.class
            )
        );
    }

    public boolean like(long routineId, long userId) {
        return jdbc.update(
            """
                insert into routine_like (routine_id, user_id)
                values (:routineId, :userId)
                on conflict (routine_id, user_id) do nothing
                """,
            parameters(routineId, userId)
        ) == 1;
    }

    public void unlike(long routineId, long userId) {
        jdbc.update(
            "delete from routine_like where routine_id = :routineId and user_id = :userId",
            parameters(routineId, userId)
        );
    }

    public boolean isLiked(long routineId, long userId) {
        return Boolean.TRUE.equals(
            jdbc.queryForObject(
                "select exists(select 1 from routine_like where routine_id = :routineId and user_id = :userId)",
                parameters(routineId, userId),
                Boolean.class
            )
        );
    }

    public long saveComment(long routineId, long userId, RoutineCommentContent content) {
        return jdbc.queryForObject(
            """
                insert into routine_comment (routine_id, user_id, content)
                values (:routineId, :userId, :content)
                returning id
                """,
            parameters(routineId, userId).addValue("content", content.value()),
            Long.class
        );
    }

    public boolean updateComment(long commentId, long userId, RoutineCommentContent content) {
        return jdbc.update(
            """
                update routine_comment c
                set content = :content
                where c.id = :commentId and c.user_id = :userId
                    and exists(
                        select 1 from routine r
                        join "user" u on u.id = r.user_id and u.deleted_at is null
                        where r.id = c.routine_id and r.is_public
                    )
                """,
            new MapSqlParameterSource()
                .addValue("commentId", commentId)
                .addValue("userId", userId)
                .addValue("content", content.value())
        ) == 1;
    }

    public boolean deleteComment(long commentId, long userId) {
        return jdbc.update(
            "delete from routine_comment where id = :commentId and user_id = :userId",
            new MapSqlParameterSource()
                .addValue("commentId", commentId)
                .addValue("userId", userId)
        ) == 1;
    }

    public RoutineCommentPage findComments(long routineId, int page, int size) {
        List<RoutineComment> comments = jdbc.query(
            COMMENTS + " order by c.created_at, c.id limit :limit offset :offset",
            new MapSqlParameterSource()
                .addValue("routineId", routineId)
                .addValue("limit", size)
                .addValue("offset", (long) (page - 1) * size),
            (resultSet, rowNumber) -> commentOf(resultSet)
        );
        Long total = jdbc.queryForObject(
            "select count(*) from (" + COMMENTS + ") comments",
            new MapSqlParameterSource("routineId", routineId),
            Long.class
        );
        return new RoutineCommentPage(comments, total);
    }

    public Optional<RoutineComment> findComment(long commentId) {
        return jdbc.query(
            COMMENTS_BY_ID,
            new MapSqlParameterSource("commentId", commentId),
            (resultSet, rowNumber) -> commentOf(resultSet)
        )
            .stream()
            .findFirst();
    }

    private RoutineComment commentOf(ResultSet resultSet) throws SQLException {
        return new RoutineComment(
            resultSet.getLong("id"),
            resultSet.getString("content"),
            resultSet.getObject("created_at", LocalDateTime.class).atZone(SEOUL).toOffsetDateTime(),
            new RoutineCommentAuthor(
                resultSet.getLong("user_id"),
                resultSet.getString("nickname"),
                resultSet.getObject("profile_image_id", UUID.class),
                skinTypeOf(resultSet)
            ),
            resultSet.getLong("routine_user_id")
        );
    }

    private static SkinType skinTypeOf(ResultSet resultSet) throws SQLException {
        String skinType = resultSet.getString("skin_type");
        if (skinType == null) {
            return null;
        }
        return SkinType.valueOf(skinType);
    }

    private static String orderOf(SharedRoutineSort sort) {
        if (sort == SharedRoutineSort.LIKES) {
            return "like_count desc, r.created_at desc, r.id desc";
        }
        if (sort == SharedRoutineSort.COMMENTS) {
            return "comment_count desc, r.created_at desc, r.id desc";
        }
        return "r.created_at desc, r.id desc";
    }

    private List<SharedRoutine> findShared(String sql, MapSqlParameterSource parameters) {
        List<SharedRoutineRow> rows = jdbc.query(
            sql,
            parameters,
            (resultSet, rowNumber) -> new SharedRoutineRow(
                RoutineRow.from(resultSet),
                resultSet.getString("nickname"),
                resultSet.getObject("profile_image_id", UUID.class),
                skinTypeOf(resultSet),
                resultSet.getLong("like_count"),
                resultSet.getLong("comment_count")
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

    private Map<Long, RoutineReactions> findReactions(List<Long> routineIds) {
        return jdbc.query(
            "select r.id, " + REACTION_COUNTS + " from routine r where r.id = any(:routineIds)",
            new MapSqlParameterSource("routineIds", new SqlArrayValue("bigint", routineIds.toArray())),
            (resultSet, rowNumber) -> Map.entry(
                resultSet.getLong("id"),
                new RoutineReactions(resultSet.getLong("like_count"), resultSet.getLong("comment_count"))
            )
        ).stream().collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));
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

    private record SharedRoutineRow(
        RoutineRow routine,
        String authorNickname,
        UUID authorProfileImageId,
        SkinType authorSkinType,
        long likeCount,
        long commentCount) {

        private SharedRoutine toSharedRoutine(RoutineProducts products) {
            return new SharedRoutine(
                routine.toRoutine(products),
                new RoutineAuthor(authorNickname, authorProfileImageId, authorSkinType),
                new RoutineReactions(likeCount, commentCount)
            );
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
