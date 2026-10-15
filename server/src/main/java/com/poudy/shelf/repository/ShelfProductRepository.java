package com.poudy.shelf.repository;

import com.poudy.exception.InfrastructureException;
import com.poudy.shelf.domain.Rating;
import com.poudy.shelf.domain.RatingPreference;
import com.poudy.shelf.domain.ShelfProduct;
import com.poudy.shelf.domain.ShelfUsageStatus;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Types;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class ShelfProductRepository {

    private static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");
    private static final String COLUMNS = """
        product_id, usage_status, rating_preference, rating_moisture_level, rating_oil_level, created_at
        """;
    private static final RowMapper<ShelfProduct> SHELF_PRODUCT = (rs, row) -> shelfProduct(rs);

    private final NamedParameterJdbcTemplate jdbc;

    public ShelfProductRepository(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    // 회원 행을 잠가 빈 선반의 첫 등록부터 분석 결과 저장까지 같은 회원의 변경을 직렬화한다.
    public void lockShelf(long userId) {
        jdbc.queryForList(
            "select id from \"user\" where id = :userId for no key update",
            new MapSqlParameterSource("userId", userId),
            Long.class
        );
    }

    public List<ShelfProduct> findAll(long userId) {
        return jdbc.query(
            "select " + COLUMNS + """
                from user_shelf_product
                where user_id = :userId
                order by created_at desc, product_id asc
                """,
            new MapSqlParameterSource("userId", userId),
            SHELF_PRODUCT
        );
    }

    public Optional<ShelfProduct> find(long userId, long productId) {
        return jdbc.query(
            "select " + COLUMNS + """
                from user_shelf_product
                where user_id = :userId and product_id = :productId
                """,
            primaryKeyParameters(userId, productId),
            SHELF_PRODUCT
        ).stream().findFirst();
    }

    public List<Long> findProductIds(long userId) {
        return jdbc.queryForList(
            """
                select product_id
                from user_shelf_product
                where user_id = :userId
                order by created_at desc, product_id asc
                """,
            new MapSqlParameterSource("userId", userId),
            Long.class
        );
    }

    public boolean add(long userId, long productId, ShelfUsageStatus usageStatus, Rating rating) {
        return jdbc.update(
            """
                insert into user_shelf_product (
                    user_id, product_id, usage_status, rating_preference, rating_moisture_level, rating_oil_level
                )
                values (:userId, :productId, :usageStatus, :preference, :moistureLevel, :oilLevel)
                on conflict (user_id, product_id) do nothing
                """,
            rowParameters(userId, productId, usageStatus, rating)
        ) > 0;
    }

    public boolean update(long userId, long productId, ShelfUsageStatus usageStatus, Rating rating) {
        return jdbc.update(
            """
                update user_shelf_product
                set usage_status = :usageStatus,
                    rating_preference = :preference,
                    rating_moisture_level = :moistureLevel,
                    rating_oil_level = :oilLevel,
                    updated_at = (now() at time zone 'Asia/Seoul')
                where user_id = :userId and product_id = :productId
                """,
            rowParameters(userId, productId, usageStatus, rating)
        ) > 0;
    }

    public void delete(long userId, long productId) {
        jdbc.update(
            "delete from user_shelf_product where user_id = :userId and product_id = :productId",
            primaryKeyParameters(userId, productId)
        );
    }

    private static ShelfProduct shelfProduct(ResultSet rs) throws SQLException {
        long productId = rs.getLong("product_id");
        try {
            return new ShelfProduct(
                productId,
                ShelfUsageStatus.valueOf(rs.getString("usage_status")),
                new Rating(
                    preference(rs),
                    rs.getObject("rating_moisture_level", Double.class),
                    rs.getObject("rating_oil_level", Double.class)
                ),
                rs.getObject("created_at", LocalDateTime.class).atZone(SEOUL).toOffsetDateTime()
            );
        } catch (IllegalArgumentException exception) {
            throw new InfrastructureException("선반 제품 데이터가 올바르지 않습니다. product_id=" + productId, exception);
        }
    }

    private static RatingPreference preference(ResultSet rs) throws SQLException {
        String preference = rs.getString("rating_preference");
        if (preference == null) {
            return null;
        }
        return RatingPreference.valueOf(preference);
    }

    private MapSqlParameterSource primaryKeyParameters(long userId, long productId) {
        return new MapSqlParameterSource()
            .addValue("userId", userId)
            .addValue("productId", productId);
    }

    private MapSqlParameterSource rowParameters(
        long userId,
        long productId,
        ShelfUsageStatus usageStatus,
        Rating rating
    ) {
        return primaryKeyParameters(userId, productId)
            .addValue("usageStatus", usageStatus.name())
            .addValue("preference", nameOf(rating.preference()), Types.VARCHAR)
            .addValue("moistureLevel", rating.moistureLevel(), Types.DOUBLE)
            .addValue("oilLevel", rating.oilLevel(), Types.DOUBLE);
    }

    private static String nameOf(Enum<?> value) {
        if (value == null) {
            return null;
        }
        return value.name();
    }
}
