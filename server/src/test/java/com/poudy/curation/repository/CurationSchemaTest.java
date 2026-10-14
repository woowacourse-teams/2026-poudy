package com.poudy.curation.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class CurationSchemaTest {
    @Autowired
    private JdbcTemplate jdbc;

    @Test
    void requiresExplicitBodyForNewCurations() {
        assertThatThrownBy(() -> jdbc.update("""
            insert into curation(id, position, title, description, banner_visible, publication_status)
            values (30, 3, '제목', '설명', false, 'PUBLISHED')
            """)).isInstanceOf(DataIntegrityViolationException.class);
    }

    @ParameterizedTest
    @ValueSource(strings = {"null", "{}"})
    void rejectsNonArrayBodies(String body) {
        assertThatThrownBy(() -> jdbc.update("update curation set blocks = cast(? as jsonb) where id = 12", body))
            .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void rejectsSqlNullButAllowsExplicitEmptyBody() {
        jdbc.update("update curation set blocks = '[]'::jsonb where id = 12");
        assertThat(jdbc.queryForObject("select blocks::text from curation where id = 12", String.class))
            .isEqualTo("[]");
        assertThatThrownBy(() -> jdbc.update("update curation set blocks = null where id = 12"))
            .isInstanceOf(DataIntegrityViolationException.class);
    }

}
