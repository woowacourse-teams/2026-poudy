package com.poudy.banner.repository;

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
class BannerSchemaTest {
    @Autowired
    private JdbcTemplate jdbc;

    @Test
    void rejectsChangingAnExistingTargetToAMissingCuration() {
        assertThatThrownBy(() -> jdbc.update("""
            update banner set target = '{"type":"CURATION","curationId":999999}' where id = 101
            """)).isInstanceOf(DataIntegrityViolationException.class);
    }

    @ParameterizedTest
    @ValueSource(strings = {"999999", "0", "-1", "1.5", "\"12\"", "null", "9223372036854775808"})
    void validatesCurationReferenceOnSave(String id) {
        assertThatThrownBy(() -> jdbc.update("""
            insert into banner(slot,title,description,target,display_order,visible)
            values('MAIN','제목','설명',cast(? as jsonb),0,false)
            """, "{\"type\":\"CURATION\",\"curationId\":" + id + "}"))
            .isInstanceOf(DataIntegrityViolationException.class);
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "target = null",
            "target = 'null'::jsonb",
            "target = '[]'::jsonb",
            "slot = 'UNKNOWN'",
            "display_order = -1",
            "title = ' '",
            "description = ' '",
            "image_url = null"})
    void enforcesBasicStorageConstraints(String assignment) {
        assertThatThrownBy(() -> jdbc.update("update banner set " + assignment + " where id = 101"))
            .isInstanceOf(DataIntegrityViolationException.class);
    }
}
