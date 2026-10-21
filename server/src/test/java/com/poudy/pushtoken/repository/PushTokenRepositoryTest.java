package com.poudy.pushtoken.repository;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.OffsetDateTime;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
@DisplayName("푸시 토큰 저장소")
class PushTokenRepositoryTest {

    @Autowired
    private PushTokenRepository repository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    @DisplayName("기준 시각 이전에 마지막으로 등록한 토큰만 지운다")
    void deletesTokensRegisteredBeforeCutoff() {
        jdbcTemplate.update(
            "insert into push_token (token, updated_at) values ('ExponentPushToken[old]', timestamp '2025-10-21 03:50')"
        );
        jdbcTemplate.update(
            "insert into push_token (token, updated_at) values ('ExponentPushToken[kept]', timestamp '2025-10-21 03:51')"
        );

        int deleted = repository.deleteRegisteredBefore(OffsetDateTime.parse("2025-10-21T03:50:00+09:00"));

        assertThat(deleted).isEqualTo(1);
        List<String> tokens = jdbcTemplate.queryForList(
            "select token from push_token where token like 'ExponentPushToken[%'",
            String.class
        );
        assertThat(tokens).containsExactly("ExponentPushToken[kept]");
    }
}
