package com.poudy.curation.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class CurationSchemaTest {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void matchesTheErdCloudCurationTables() {
        assertThat(columnsOf("curation")).containsExactly(
            "id",
            "position",
            "title",
            "description",
            "banner_visible",
            "banner_thumbnail_image_url",
            "publication_status",
            "created_at",
            "updated_at"
        );
        assertThat(columnsOf("curation_block")).containsExactly(
            "id",
            "curation_id",
            "position",
            "type",
            "spacing_top",
            "spacing_bottom",
            "image_url",
            "created_at",
            "updated_at"
        );
        assertThat(columnsOf("curation_block_filter")).containsExactly(
            "id",
            "block_id",
            "position",
            "label",
            "created_at",
            "updated_at"
        );
        assertThat(columnsOf("curation_block_product")).containsExactly(
            "block_id",
            "product_id",
            "position",
            "created_at",
            "updated_at"
        );
        assertThat(columnsOf("curation_block_product_filter")).containsExactly(
            "block_id",
            "product_id",
            "filter_id",
            "position",
            "created_at",
            "updated_at"
        );
    }

    @Test
    void usesKoreanLocalTimestampDefaultsForCurationAuditColumns() {
        Integer auditColumnCount = jdbcTemplate.queryForObject(
            """
                SELECT count(*)
                FROM information_schema.columns
                WHERE table_schema = current_schema()
                  AND table_name IN (
                      'curation',
                      'curation_block',
                      'curation_block_filter',
                      'curation_block_product',
                      'curation_block_product_filter'
                  )
                  AND column_name IN ('created_at', 'updated_at')
                  AND data_type = 'timestamp without time zone'
                  AND is_nullable = 'NO'
                  AND column_default LIKE '%Asia/Seoul%'
                """,
            Integer.class
        );

        assertThat(auditColumnCount).isEqualTo(10);
    }

    @Test
    void rejectsFiltersForBlocksThatAreNotFilterBlocks() {
        assertThatThrownBy(
            () -> jdbcTemplate.update(
                "INSERT INTO curation_block_filter (id, block_id, position, label) VALUES (?, ?, ?, ?)",
                UUID.randomUUID(),
                UUID.fromString("00000000-0000-4000-8000-000000000001"),
                0,
                "잘못된 필터"
            )
        ).isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void rejectsProductsForImageBlocks() {
        assertThatThrownBy(
            () -> jdbcTemplate.update(
                "INSERT INTO curation_block_product (block_id, product_id, position) VALUES (?, ?, ?)",
                UUID.fromString("00000000-0000-4000-8000-000000000001"),
                10L,
                0
            )
        ).isInstanceOf(DataIntegrityViolationException.class);
    }

    private List<String> columnsOf(String tableName) {
        return jdbcTemplate.queryForList(
            """
                SELECT column_name
                FROM information_schema.columns
                WHERE table_schema = current_schema()
                  AND table_name = ?
                ORDER BY ordinal_position
                """,
            String.class,
            tableName
        );
    }
}
