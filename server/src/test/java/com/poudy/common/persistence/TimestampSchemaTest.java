package com.poudy.common.persistence;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class TimestampSchemaTest {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void usesKoreanLocalTimestamps() {
        List<String> invalidColumns = jdbcTemplate.queryForList(
            """
                SELECT table_name || '.' || column_name
                FROM information_schema.columns
                WHERE table_schema = current_schema()
                  AND (column_name LIKE '%\\_at' ESCAPE '\\' OR column_name = 'bucket_start')
                  AND data_type <> 'timestamp without time zone'
                ORDER BY table_name, ordinal_position
                """,
            String.class
        );

        assertThat(invalidColumns).isEmpty();
    }
}
