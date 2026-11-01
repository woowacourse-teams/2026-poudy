package com.poudy.user.repository;

import com.poudy.user.domain.NicknameCombination;
import java.util.OptionalInt;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class NicknameSequenceRepository {

    private static final String NEXT_NUMBER = """
        insert into nickname_sequence (adjective, noun, last_number) values (:adjective, :noun, :firstNumber)
        on conflict (adjective, noun) do update set last_number = nickname_sequence.last_number + 1
        where nickname_sequence.last_number < :lastNumber
        returning last_number
        """;

    private final NamedParameterJdbcTemplate jdbc;

    public NicknameSequenceRepository(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public OptionalInt next(NicknameCombination combination) {
        return jdbc.query(
            NEXT_NUMBER,
            new MapSqlParameterSource()
                .addValue("adjective", combination.adjectiveWord())
                .addValue("noun", combination.nounWord())
                .addValue("firstNumber", NicknameCombination.FIRST_NUMBER)
                .addValue("lastNumber", NicknameCombination.LAST_NUMBER),
            (rs, row) -> rs.getInt("last_number")
        ).stream().mapToInt(Integer::intValue).findFirst();
    }
}
