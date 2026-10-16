package com.poudy.pushtoken.repository;

import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class PushTokenRepository {

    private final NamedParameterJdbcTemplate jdbc;

    public PushTokenRepository(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public void saveAnonymous(String token) {
        jdbc.update(
            """
                insert into push_token (token, user_id)
                values (:token, null)
                on conflict (token) do update
                set user_id = null,
                    updated_at = now() at time zone 'Asia/Seoul'
                """,
            new MapSqlParameterSource("token", token)
        );
    }

    public void saveForUser(String token, long userId) {
        jdbc.update(
            """
                insert into push_token (token, user_id)
                values (:token, (select id from "user" where id = :userId and deleted_at is null))
                on conflict (token) do update
                set user_id = excluded.user_id,
                    updated_at = now() at time zone 'Asia/Seoul'
                """,
            new MapSqlParameterSource()
                .addValue("token", token)
                .addValue("userId", userId)
        );
    }
}
