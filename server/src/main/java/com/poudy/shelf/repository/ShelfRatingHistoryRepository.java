package com.poudy.shelf.repository;

import com.poudy.exception.InfrastructureException;
import com.poudy.shelf.domain.RaterProfile;
import com.poudy.shelf.domain.Rating;
import com.poudy.shelf.domain.RatingPreference;
import com.poudy.shelf.domain.ShelfRatingHistory;
import com.poudy.shelf.domain.ShelfRatingRecord;
import com.poudy.shelf.domain.ShelfUsageStatus;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Types;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.support.SqlArrayValue;
import org.springframework.stereotype.Repository;

@Repository
public class ShelfRatingHistoryRepository {

    private final NamedParameterJdbcTemplate jdbc;

    public ShelfRatingHistoryRepository(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public ShelfRatingHistory findCurrent(long userId, long productId) {
        Map<Long, ShelfRatingRecord> currentRecords = new LinkedHashMap<>();
        jdbc.query(
            """
                select id, usage_status, rating_preference, rating_moisture_level, rating_oil_level,
                       gender, age_range, skin_type, is_sensitive_skin, recorded_on
                from user_shelf_product_history
                where user_id = :userId and product_id = :productId and is_current
                """,
            userProductParameters(userId, productId),
            rs -> {
                currentRecords.put(rs.getLong("id"), record(rs));
            }
        );
        return ShelfRatingHistory.of(currentRecords);
    }

    public void supersede(Set<Long> ids) {
        if (ids.isEmpty()) {
            return;
        }
        jdbc.update(
            "update user_shelf_product_history set is_current = false where id = any(:ids)",
            new MapSqlParameterSource("ids", new SqlArrayValue("bigint", ids.toArray()))
        );
    }

    public void add(long userId, long productId, ShelfRatingRecord record) {
        Rating rating = record.rating();
        RaterProfile profile = record.profile();
        jdbc.update(
            """
                insert into user_shelf_product_history (
                    user_id, product_id, usage_status, rating_preference, rating_moisture_level, rating_oil_level,
                    gender, age_range, skin_type, is_sensitive_skin, recorded_on, is_current
                )
                values (
                    :userId, :productId, :usageStatus, :preference, :moistureLevel, :oilLevel,
                    :gender, :ageRange, :skinType, :sensitiveSkin, :recordedOn, true
                )
                """,
            userProductParameters(userId, productId)
                .addValue("usageStatus", record.usageStatus().name())
                .addValue("preference", nameOf(rating.preference()), Types.VARCHAR)
                .addValue("moistureLevel", rating.moistureLevel(), Types.DOUBLE)
                .addValue("oilLevel", rating.oilLevel(), Types.DOUBLE)
                .addValue("gender", profile.gender(), Types.VARCHAR)
                .addValue("ageRange", profile.ageRange(), Types.VARCHAR)
                .addValue("skinType", profile.skinType(), Types.VARCHAR)
                .addValue("sensitiveSkin", profile.sensitiveSkin(), Types.BOOLEAN)
                .addValue("recordedOn", record.recordedOn())
        );
    }

    private static ShelfRatingRecord record(ResultSet rs) throws SQLException {
        long id = rs.getLong("id");
        try {
            return new ShelfRatingRecord(
                ShelfUsageStatus.valueOf(rs.getString("usage_status")),
                new Rating(
                    preference(rs),
                    rs.getObject("rating_moisture_level", Double.class),
                    rs.getObject("rating_oil_level", Double.class)
                ),
                new RaterProfile(
                    rs.getString("gender"),
                    rs.getString("age_range"),
                    rs.getString("skin_type"),
                    rs.getObject("is_sensitive_skin", Boolean.class)
                ),
                rs.getObject("recorded_on", LocalDate.class)
            );
        } catch (IllegalArgumentException exception) {
            throw new InfrastructureException("선반 평가 이력 데이터가 올바르지 않습니다. id=" + id, exception);
        }
    }

    private static RatingPreference preference(ResultSet rs) throws SQLException {
        String preference = rs.getString("rating_preference");
        if (preference == null) {
            return null;
        }
        return RatingPreference.valueOf(preference);
    }

    private static MapSqlParameterSource userProductParameters(long userId, long productId) {
        return new MapSqlParameterSource()
            .addValue("userId", userId)
            .addValue("productId", productId);
    }

    private static String nameOf(Enum<?> value) {
        if (value == null) {
            return null;
        }
        return value.name();
    }
}
