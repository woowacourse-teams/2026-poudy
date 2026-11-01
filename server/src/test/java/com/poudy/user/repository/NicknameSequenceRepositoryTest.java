package com.poudy.user.repository;

import static org.assertj.core.api.Assertions.assertThat;

import com.poudy.user.domain.NicknameAdjective;
import com.poudy.user.domain.NicknameCombination;
import com.poudy.user.domain.NicknameNoun;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

@SpringBootTest
@DisplayName("닉네임 순번 저장소")
class NicknameSequenceRepositoryTest {

    private static final NicknameCombination COMBINATION = new NicknameCombination(
        NicknameAdjective.HUMBLE,
        NicknameNoun.MARTEN
    );

    @Autowired
    private NicknameSequenceRepository repository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @BeforeEach
    @AfterEach
    void clear() {
        jdbcTemplate.update("delete from nickname_sequence where adjective = '겸손한' and noun = '담비'");
    }

    @Test
    @DisplayName("처음 쓰는 조합은 1000부터, 이후로는 하나씩 늘려 돌려준다")
    void issuesIncreasingNumbers() {
        assertThat(repository.next(COMBINATION)).hasValue(1_000);
        assertThat(repository.next(COMBINATION)).hasValue(1_001);
    }

    @Test
    @DisplayName("마지막 순번까지 쓴 조합은 번호를 돌려주지 않는다")
    void stopsAtLastNumber() {
        jdbcTemplate.update(
            "insert into nickname_sequence (adjective, noun, last_number) values ('겸손한', '담비', ?)",
            NicknameCombination.LAST_NUMBER
        );

        assertThat(repository.next(COMBINATION)).isEmpty();
    }
}
