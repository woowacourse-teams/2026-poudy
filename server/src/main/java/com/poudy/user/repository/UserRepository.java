package com.poudy.user.repository;

import com.poudy.security.domain.OAuthAccount;
import com.poudy.security.domain.OAuthProvider;
import com.poudy.skintype.domain.SkinType;
import com.poudy.user.domain.AgeRange;
import com.poudy.user.domain.Gender;
import com.poudy.user.domain.RestoreRequest;
import com.poudy.user.domain.User;
import com.poudy.user.domain.UserSignup;
import com.poudy.user.domain.UserStatus;
import com.poudy.user.domain.WithdrawnUser;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Types;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;
import java.util.function.Function;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class UserRepository {

    private static final String COLUMNS = """
        id, oauth_provider, email, gender, age_range, skin_type,
        case
            when restore_requested_at is not null then 'RESTORE_REQUESTED'
            when deleted_at is not null then 'WITHDRAWN'
            else 'ACTIVE'
        end as status
        """;
    private static final RowMapper<User> USER = (rs, row) -> new User(
        rs.getLong("id"),
        OAuthProvider.valueOf(rs.getString("oauth_provider")),
        rs.getString("email"),
        enumOrNull(rs, "gender", Gender::valueOf),
        enumOrNull(rs, "age_range", AgeRange::valueOf),
        enumOrNull(rs, "skin_type", SkinType::valueOf),
        UserStatus.valueOf(rs.getString("status"))
    );

    private static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");
    private static final RowMapper<RestoreRequest> RESTORE_REQUEST = (rs, row) -> new RestoreRequest(
        rs.getLong("id"),
        OAuthProvider.valueOf(rs.getString("oauth_provider")),
        rs.getString("email"),
        offset(rs.getObject("deleted_at", LocalDateTime.class)),
        offset(rs.getObject("restore_requested_at", LocalDateTime.class))
    );
    private static final RowMapper<WithdrawnUser> WITHDRAWN_USER = (rs, row) -> new WithdrawnUser(
        OAuthProvider.valueOf(rs.getString("oauth_provider")),
        rs.getString("email"),
        offset(rs.getObject("deleted_at", LocalDateTime.class))
    );

    private final NamedParameterJdbcTemplate jdbc;

    public UserRepository(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public boolean isActive(long id) {
        return jdbc.queryForObject(
            "select exists(select 1 from \"user\" where id = :id and deleted_at is null)",
            new MapSqlParameterSource("id", id),
            Boolean.class
        );
    }

    public Optional<User> findById(long id) {
        return jdbc.query(
            "select " + COLUMNS + " from \"user\" where id = :id and deleted_at is null",
            new MapSqlParameterSource("id", id),
            USER
        ).stream().findFirst();
    }

    public Optional<WithdrawnUser> findWithdrawnById(long id) {
        return jdbc.query(
            "select oauth_provider, email, deleted_at from \"user\" where id = :id and deleted_at is not null",
            new MapSqlParameterSource("id", id),
            WITHDRAWN_USER
        ).stream().findFirst();
    }

    public Optional<User> findByAccount(OAuthAccount account) {
        return jdbc.query(
            "select " + COLUMNS + " from \"user\" where oauth_provider = :provider and oauth_provider_id = :providerId",
            new MapSqlParameterSource()
                .addValue("provider", account.provider().name())
                .addValue("providerId", account.providerId()),
            USER
        ).stream().findFirst();
    }

    public Optional<User> findByEmail(String email) {
        return jdbc.query(
            "select " + COLUMNS + " from \"user\" where email = :email",
            new MapSqlParameterSource("email", email),
            USER
        ).stream().findFirst();
    }

    public User save(UserSignup signup) {
        return jdbc.queryForObject(
            """
                insert into "user" (oauth_provider, oauth_provider_id, email)
                values (:provider, :providerId, :email)
                returning\s""" + COLUMNS,
            new MapSqlParameterSource()
                .addValue("provider", signup.provider().name())
                .addValue("providerId", signup.providerId())
                .addValue("email", signup.email()),
            USER
        );
    }

    public Optional<User> updateProfile(long id, Gender gender, AgeRange ageRange, SkinType skinType) {
        return jdbc.query(
            """
                update "user"
                set gender = :gender, age_range = :ageRange, skin_type = :skinType,
                    updated_at = (now() AT TIME ZONE 'Asia/Seoul')
                where id = :id and deleted_at is null
                returning\s""" + COLUMNS,
            new MapSqlParameterSource()
                .addValue("id", id)
                .addValue("gender", nameOf(gender), Types.VARCHAR)
                .addValue("ageRange", nameOf(ageRange), Types.VARCHAR)
                .addValue("skinType", nameOf(skinType), Types.VARCHAR),
            USER
        ).stream().findFirst();
    }

    public boolean withdraw(long id) {
        return jdbc.update(
            """
                update "user"
                set deleted_at = (now() AT TIME ZONE 'Asia/Seoul'), updated_at = (now() AT TIME ZONE 'Asia/Seoul')
                where id = :id and deleted_at is null
                """,
            new MapSqlParameterSource("id", id)
        ) == 1;
    }

    public boolean requestRestore(long id) {
        return jdbc.update(
            """
                update "user"
                set restore_requested_at = coalesce(restore_requested_at, (now() AT TIME ZONE 'Asia/Seoul')),
                    updated_at = (now() AT TIME ZONE 'Asia/Seoul')
                where id = :id and deleted_at is not null
                """,
            new MapSqlParameterSource("id", id)
        ) == 1;
    }

    public long countRestoreRequests() {
        return jdbc.queryForObject(
            "select count(*) from \"user\" where restore_requested_at is not null",
            new MapSqlParameterSource(),
            Long.class
        );
    }

    public List<RestoreRequest> findRestoreRequests(long offset, int size) {
        return jdbc.query(
            """
                select id, oauth_provider, email, deleted_at, restore_requested_at
                from "user"
                where restore_requested_at is not null
                order by restore_requested_at, id
                offset :offset limit :size
                """,
            new MapSqlParameterSource()
                .addValue("offset", offset)
                .addValue("size", size),
            RESTORE_REQUEST
        );
    }

    public boolean restore(long id) {
        return jdbc.update(
            """
                update "user"
                set deleted_at = null, restore_requested_at = null,
                    updated_at = (now() AT TIME ZONE 'Asia/Seoul')
                where id = :id and restore_requested_at is not null
                """,
            new MapSqlParameterSource("id", id)
        ) == 1;
    }

    public int deleteWithdrawnBefore(OffsetDateTime cutoff) {
        return jdbc.update(
            "delete from \"user\" where deleted_at <= :cutoff",
            new MapSqlParameterSource("cutoff", cutoff.atZoneSameInstant(SEOUL).toLocalDateTime())
        );
    }

    private static OffsetDateTime offset(LocalDateTime value) {
        return value.atZone(SEOUL).toOffsetDateTime();
    }

    private static <T> T enumOrNull(ResultSet rs, String column, Function<String, T> parse) throws SQLException {
        String value = rs.getString(column);
        if (value == null) {
            return null;
        }
        return parse.apply(value);
    }

    private static String nameOf(Enum<?> value) {
        if (value == null) {
            return null;
        }
        return value.name();
    }
}
