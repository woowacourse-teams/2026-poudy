package com.poudy.user.repository;

import com.poudy.exception.ErrorCode;
import com.poudy.exception.ResourceNotFoundException;
import com.poudy.security.domain.OAuthProvider;
import com.poudy.user.domain.RecoveryAccount;
import com.poudy.user.domain.RetainedUserData;
import java.time.Clock;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Locale;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class RecoveryRepository {
    private static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");
    private static final String SOURCE = """
        (select u.id,u.oauth_provider,u.email,u.deleted_at withdrawn_at,u.restore_requested_at requested_at,null::timestamp restored_at from "user" u where u.deleted_at is not null
        union all select u.id,u.oauth_provider,u.email,u.restored_withdrawn_at withdrawn_at,u.restored_requested_at requested_at,u.restored_at from "user" u where u.deleted_at is null and u.restored_at>=(now() AT TIME ZONE 'Asia/Seoul')-interval '30 days') r
        """;
    private final NamedParameterJdbcTemplate jdbc;
    private final Duration retention;
    private final Clock clock;
    public RecoveryRepository(
        NamedParameterJdbcTemplate jdbc,
        @Value("${poudy.user.retention.max-age:P30D}") Duration retention,
        Clock clock
    ) {
        this.jdbc = jdbc;
        this.retention = retention;
        this.clock = clock;
    }

    public List<RecoveryAccount> find(String email, OAuthProvider provider, String status, long offset, int size) {
        return jdbc.query(
            "select * from " + SOURCE
                + " where (:email='' or email=:email) and (:provider='' or oauth_provider=:provider) and (:status='' or (case when restored_at is not null then 'RESTORED' when withdrawn_at<=cast(:cutoff as timestamp) then 'EXPIRED' when withdrawn_at<=cast(:soon as timestamp) then 'EXPIRING' else 'AVAILABLE' end)=:status) order by restored_at nulls first,withdrawn_at,id offset :offset limit :size",
            params(email, provider, status).addValue("offset", offset).addValue("size", size),
            (r, n) -> account(
                r.getLong("id"),
                OAuthProvider.valueOf(r.getString("oauth_provider")),
                r.getString("email"),
                r.getObject("withdrawn_at", LocalDateTime.class),
                r.getObject("requested_at", LocalDateTime.class),
                r.getObject("restored_at", LocalDateTime.class)
            )
        );
    }

    public long count(String email, OAuthProvider provider, String status) {
        return jdbc.queryForObject(
            "select count(*) from " + SOURCE
                + " where (:email='' or email=:email) and (:provider='' or oauth_provider=:provider) and (:status='' or (case when restored_at is not null then 'RESTORED' when withdrawn_at<=cast(:cutoff as timestamp) then 'EXPIRED' when withdrawn_at<=cast(:soon as timestamp) then 'EXPIRING' else 'AVAILABLE' end)=:status)",
            params(email, provider, status),
            Long.class
        );
    }

    public RecoveryAccount detail(long id) {
        return jdbc
            .query(
                "select * from " + SOURCE + " where id=:id and restored_at is null",
                new MapSqlParameterSource("id", id),
                (r, n) -> account(
                    id,
                    OAuthProvider.valueOf(r.getString("oauth_provider")),
                    r.getString("email"),
                    r.getObject("withdrawn_at", LocalDateTime.class),
                    r.getObject("requested_at", LocalDateTime.class),
                    null
                )
            ).stream().findFirst()
            .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.RESTORE_REQUEST_NOT_FOUND));
    }

    public RetainedUserData retainedData(long id) {
        return jdbc.queryForObject(
            """
                select (select count(*) from user_shelf_product where user_id=:id and deleted_at is null) shelf,
                (select count(*) from user_shelf_product where user_id=:id and deleted_at is null and rating_preference is not null) ratings,
                (select count(*) from user_wishlist_product where user_id=:id and deleted_at is null) wishlist,
                (select count(*) from user_my_filter_ingredient where user_id=:id) filters,
                exists(select 1 from "user" where id=:id and (gender is not null or age_range is not null or skin_type is not null or is_sensitive_skin is not null)) profile
                """,
            new MapSqlParameterSource("id", id),
            (r, n) -> new RetainedUserData(
                r.getLong("shelf"),
                r.getLong("ratings"),
                r.getLong("wishlist"),
                r.getLong("filters"),
                r.getBoolean("profile")
            )
        );
    }

    public long available(boolean soon) {
        return jdbc.queryForObject(
            "select count(*) from \"user\" where deleted_at>cast(:cutoff as timestamp)"
                + (soon ? " and deleted_at<=cast(:soon as timestamp)" : ""),
            new MapSqlParameterSource("cutoff", LocalDateTime.ofInstant(clock.instant().minus(retention), SEOUL))
                .addValue(
                    "soon",
                    LocalDateTime.ofInstant(clock.instant().minus(retention).plus(Duration.ofDays(7)), SEOUL)
                ),
            Long.class
        );
    }

    private RecoveryAccount account(
        long id,
        OAuthProvider provider,
        String email,
        LocalDateTime withdrawn,
        LocalDateTime requested,
        LocalDateTime restored
    ) {
        var deadline = at(withdrawn).plus(retention);
        boolean open = restored == null && deadline.isAfter(OffsetDateTime.now(clock));
        String status = restored != null ? "RESTORED"
            : !open ? "EXPIRED" : !deadline.isAfter(OffsetDateTime.now(clock).plusDays(7)) ? "EXPIRING" : "AVAILABLE";
        int index = email.indexOf('@');
        String masked = email.substring(0, Math.min(2, Math.max(0, index))) + "***"
            + (index < 0 ? "" : email.substring(index));
        return new RecoveryAccount(
            id,
            provider,
            masked,
            at(withdrawn),
            at(requested),
            deadline,
            at(restored),
            open && requested != null,
            status
        );
    }

    private static OffsetDateTime at(LocalDateTime value) {
        return value == null ? null : value.atZone(SEOUL).toOffsetDateTime();
    }

    private MapSqlParameterSource params(String email, OAuthProvider provider, String status) {
        return new MapSqlParameterSource("email", email == null ? "" : email.strip().toLowerCase(Locale.ROOT))
            .addValue("provider", provider == null ? "" : provider.name())
            .addValue("status", status == null ? "" : status)
            .addValue("cutoff", LocalDateTime.ofInstant(clock.instant().minus(retention), SEOUL)).addValue(
                "soon",
                LocalDateTime.ofInstant(clock.instant().minus(retention).plus(Duration.ofDays(7)), SEOUL)
            );
    }
}
