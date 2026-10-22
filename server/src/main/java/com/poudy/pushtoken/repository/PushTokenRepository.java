package com.poudy.pushtoken.repository;

import java.time.OffsetDateTime;
import java.time.ZoneId;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class PushTokenRepository {

    private static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");
    private static final String ACTIVE_USER_ID = """
        (select id from "user" where id = cast(:userId as bigint) and deleted_at is null)""";

    private final NamedParameterJdbcTemplate jdbc;

    public PushTokenRepository(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public boolean save(String token, Long userId) {
        return jdbc.queryForObject(
            """
                insert into push_token (token, user_id)
                values (:token, %s)
                on conflict (token) do update
                set user_id = excluded.user_id,
                    updated_at = now() at time zone 'Asia/Seoul'
                returning is_enabled
                """.formatted(ACTIVE_USER_ID),
            parameters(token, userId),
            Boolean.class
        );
    }

    public void saveEnabled(String token, Long userId, boolean enabled) {
        jdbc.update(
            """
                insert into push_token (token, user_id, is_enabled)
                values (:token, %s, :enabled)
                on conflict (token) do update
                set user_id = excluded.user_id,
                    is_enabled = excluded.is_enabled,
                    updated_at = now() at time zone 'Asia/Seoul'
                """.formatted(ACTIVE_USER_ID),
            parameters(token, userId).addValue("enabled", enabled)
        );
    }

    public int deleteRegisteredBefore(OffsetDateTime cutoff) {
        return jdbc.update(
            "delete from push_token where updated_at <= :cutoff",
            new MapSqlParameterSource("cutoff", cutoff.atZoneSameInstant(SEOUL).toLocalDateTime())
        );
    }

    private MapSqlParameterSource parameters(String token, Long userId) {
        return new MapSqlParameterSource()
            .addValue("token", token)
            .addValue("userId", userId);
    }
}
