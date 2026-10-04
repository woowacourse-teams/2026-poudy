package com.poudy.member.repository;

import com.poudy.member.domain.AgeRange;
import com.poudy.member.domain.Gender;
import com.poudy.member.domain.Member;
import com.poudy.member.domain.MemberSignup;
import com.poudy.member.domain.MemberSkinType;
import com.poudy.member.domain.MemberStatus;
import com.poudy.member.domain.RestoreRequest;
import com.poudy.security.domain.OAuthAccount;
import com.poudy.security.domain.OAuthProvider;
import java.sql.ResultSet;
import java.sql.SQLException;
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
public class MemberRepository {

    private static final String COLUMNS = """
        id, oauth_provider, email, gender, age_range, skin_type,
        case
            when restore_requested_at is not null then 'RESTORE_REQUESTED'
            when deleted_at is not null then 'WITHDRAWN'
            else 'ACTIVE'
        end as status
        """;
    private static final RowMapper<Member> MEMBER = (rs, row) -> new Member(
        rs.getLong("id"),
        OAuthProvider.valueOf(rs.getString("oauth_provider")),
        rs.getString("email"),
        enumOrNull(rs, "gender", Gender::valueOf),
        enumOrNull(rs, "age_range", AgeRange::valueOf),
        enumOrNull(rs, "skin_type", MemberSkinType::valueOf),
        MemberStatus.valueOf(rs.getString("status"))
    );

    private static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");
    private static final RowMapper<RestoreRequest> RESTORE_REQUEST = (rs, row) -> new RestoreRequest(
        rs.getLong("id"),
        OAuthProvider.valueOf(rs.getString("oauth_provider")),
        rs.getString("email"),
        offset(rs.getObject("deleted_at", LocalDateTime.class)),
        offset(rs.getObject("restore_requested_at", LocalDateTime.class))
    );

    private final NamedParameterJdbcTemplate jdbc;

    public MemberRepository(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public Optional<Member> findById(long id) {
        return jdbc.query(
            "select " + COLUMNS + " from member where id = :id and deleted_at is null",
            new MapSqlParameterSource("id", id),
            MEMBER
        ).stream().findFirst();
    }

    public Optional<Member> findByAccount(OAuthAccount account) {
        return jdbc.query(
            "select " + COLUMNS + " from member where oauth_provider = :provider and oauth_provider_id = :providerId",
            new MapSqlParameterSource()
                .addValue("provider", account.provider().name())
                .addValue("providerId", account.providerId()),
            MEMBER
        ).stream().findFirst();
    }

    public Optional<Member> findByEmail(String email) {
        return jdbc.query(
            "select " + COLUMNS + " from member where email = :email",
            new MapSqlParameterSource("email", email),
            MEMBER
        ).stream().findFirst();
    }

    public Member save(MemberSignup signup) {
        return jdbc.queryForObject(
            """
                insert into member (oauth_provider, oauth_provider_id, email)
                values (:provider, :providerId, :email)
                returning\s""" + COLUMNS,
            new MapSqlParameterSource()
                .addValue("provider", signup.provider().name())
                .addValue("providerId", signup.providerId())
                .addValue("email", signup.email()),
            MEMBER
        );
    }

    public Optional<Member> updateProfile(long id, Gender gender, AgeRange ageRange, MemberSkinType skinType) {
        return jdbc.query(
            """
                update member
                set gender = :gender, age_range = :ageRange, skin_type = :skinType,
                    updated_at = (now() AT TIME ZONE 'Asia/Seoul')
                where id = :id and deleted_at is null
                returning\s""" + COLUMNS,
            new MapSqlParameterSource()
                .addValue("id", id)
                .addValue("gender", gender.name())
                .addValue("ageRange", ageRange.name())
                .addValue("skinType", skinType.name()),
            MEMBER
        ).stream().findFirst();
    }

    public boolean withdraw(long id) {
        return jdbc.update(
            """
                update member
                set deleted_at = (now() AT TIME ZONE 'Asia/Seoul'), updated_at = (now() AT TIME ZONE 'Asia/Seoul')
                where id = :id and deleted_at is null
                """,
            new MapSqlParameterSource("id", id)
        ) == 1;
    }

    public boolean requestRestore(long id) {
        return jdbc.update(
            """
                update member
                set restore_requested_at = coalesce(restore_requested_at, (now() AT TIME ZONE 'Asia/Seoul')),
                    updated_at = (now() AT TIME ZONE 'Asia/Seoul')
                where id = :id and deleted_at is not null
                """,
            new MapSqlParameterSource("id", id)
        ) == 1;
    }

    public long countRestoreRequests() {
        return jdbc.queryForObject(
            "select count(*) from member where restore_requested_at is not null",
            new MapSqlParameterSource(),
            Long.class
        );
    }

    public List<RestoreRequest> findRestoreRequests(long offset, int size) {
        return jdbc.query(
            """
                select id, oauth_provider, email, deleted_at, restore_requested_at
                from member
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
                update member
                set deleted_at = null, restore_requested_at = null,
                    updated_at = (now() AT TIME ZONE 'Asia/Seoul')
                where id = :id and restore_requested_at is not null
                """,
            new MapSqlParameterSource("id", id)
        ) == 1;
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
}
