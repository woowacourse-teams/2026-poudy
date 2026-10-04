package com.poudy.member.repository;

import com.poudy.member.domain.AgeRange;
import com.poudy.member.domain.Gender;
import com.poudy.member.domain.Member;
import com.poudy.member.domain.MemberSignup;
import com.poudy.member.domain.MemberSkinType;
import com.poudy.security.domain.OAuthAccount;
import com.poudy.security.domain.OAuthProvider;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Optional;
import java.util.function.Function;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class MemberRepository {

    private static final String COLUMNS = "id, oauth_provider, email, gender, age_range, skin_type";
    private static final RowMapper<Member> MEMBER = (rs, row) -> new Member(
        rs.getLong("id"),
        OAuthProvider.valueOf(rs.getString("oauth_provider")),
        rs.getString("email"),
        enumOrNull(rs, "gender", Gender::valueOf),
        enumOrNull(rs, "age_range", AgeRange::valueOf),
        enumOrNull(rs, "skin_type", MemberSkinType::valueOf)
    );

    private final NamedParameterJdbcTemplate jdbc;

    public MemberRepository(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public Optional<Member> findById(long id) {
        return jdbc.query(
            "select " + COLUMNS + " from member where id = :id",
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

    private static <T> T enumOrNull(ResultSet rs, String column, Function<String, T> parse) throws SQLException {
        String value = rs.getString(column);
        if (value == null) {
            return null;
        }
        return parse.apply(value);
    }
}
