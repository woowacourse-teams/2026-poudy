package com.poudy.user.repository;

import com.poudy.exception.ErrorCode;
import com.poudy.exception.ResourceNotFoundException;
import com.poudy.security.domain.OAuthProvider;
import com.poudy.user.domain.RecoveryAccount;
import java.time.Clock;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class RecoveryRepository {
    private static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");
    private static final String SOURCE = """
        (select u.id,u.oauth_provider,u.email,u.deleted_at withdrawn_at,u.restore_requested_at requested_at,null::timestamp restored_at from "user" u where u.deleted_at is not null
        union all select u.id,u.oauth_provider,u.email,h.withdrawn_at,h.requested_at,h.restored_at from user_withdrawal_history h join "user" u on u.id=h.user_id where u.deleted_at is null and h.restored_at>=(now() AT TIME ZONE 'Asia/Seoul')-interval '30 days') r
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

    public Map<String, Long> counts(long id) {
        return jdbc.queryForObject(
            """
                select (select count(*) from user_shelf_product where user_id=:id) shelf,
                (select count(*) from user_shelf_product where user_id=:id and rating_preference is not null) ratings,
                (select count(*) from user_wishlist_product where user_id=:id) wishlist,
                (select count(*) from user_skin_filter_ingredient where user_id=:id) filters,
                (select count(*) from "user" where id=:id and (gender is not null or age_range is not null or skin_type is not null or is_sensitive_skin is not null)) profile
                """,
            new MapSqlParameterSource("id", id),
            (r, n) -> Map.of(
                "shelf",
                r.getLong("shelf"),
                "ratings",
                r.getLong("ratings"),
                "wishlist",
                r.getLong("wishlist"),
                "filters",
                r.getLong("filters"),
                "profile",
                r.getLong("profile")
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

    public Map<String, Long> monthly() {
        return jdbc.query(
            "select * from user_retention_monthly_stat where month=date_trunc('month',now() AT TIME ZONE 'Asia/Seoul')::date",
            (r) -> {
                if (!r.next()) {
                    return Map.of("restored", 0L, "purged", 0L);
                }
                return Map.of("restored", r.getLong("admin_restore_count"), "purged", r.getLong("purged_count"));
            }
        );
    }

    public OffsetDateTime trackingStarted() {
        return jdbc.queryForObject(
            "select min(tracking_started_at) from user_retention_monthly_stat",
            new MapSqlParameterSource(),
            (r, n) -> at(r.getObject(1, LocalDateTime.class))
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
