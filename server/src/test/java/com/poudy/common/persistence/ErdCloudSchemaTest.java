package com.poudy.common.persistence;

import static java.util.Map.entry;
import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class ErdCloudSchemaTest {

    private static final Map<String, List<String>> ERD_COLUMNS = Map.ofEntries(
        entry("brand", List.of("id", "korean_name", "english_name", "image_url", "created_at", "updated_at")),
        entry("category", List.of("id", "parent_id", "name", "depth", "created_at", "updated_at")),
        entry(
            "curation",
            List.of(
                "id",
                "position",
                "title",
                "description",
                "banner_visible",
                "banner_thumbnail_image_url",
                "publication_status",
                "created_at",
                "updated_at"
            )
        ),
        entry(
            "curation_block",
            List.of(
                "id",
                "curation_id",
                "position",
                "type",
                "spacing_top",
                "spacing_bottom",
                "image_url",
                "created_at",
                "updated_at"
            )
        ),
        entry("curation_block_filter", List.of("id", "block_id", "position", "label", "created_at", "updated_at")),
        entry("curation_block_product", List.of("block_id", "product_id", "position", "created_at", "updated_at")),
        entry(
            "curation_block_product_filter",
            List.of("block_id", "product_id", "filter_id", "position", "created_at", "updated_at")
        ),
        entry(
            "exclude_code_ingredient",
            List.of("exclude_code", "ingredient_id", "display_order", "created_at", "updated_at")
        ),
        entry(
            "feedback",
            List.of("id", "subject_type", "content", "page_path", "status", "status_changed_at", "created_at")
        ),
        entry("feedback_image", List.of("image_id", "feedback_id", "display_order", "created_at", "updated_at")),
        entry("ingredient", List.of("id", "korean_name", "english_name", "description", "updated_at", "created_at")),
        entry("ingredient_alias", List.of("id", "ingredient_id", "alias", "created_at", "updated_at")),
        entry("ingredient_source", List.of("id", "ingredient_id", "type", "content", "created_at", "updated_at")),
        entry("ingredient_tag", List.of("ingredient_id", "tag_code", "display_order", "created_at", "updated_at")),
        entry(
            "product",
            List.of(
                "id",
                "brand_id",
                "category_id",
                "product_name",
                "image_url",
                "moisture_level",
                "oil_level",
                "updated_at",
                "created_at"
            )
        ),
        entry("product_component", List.of("id", "product_id", "display_order", "name", "created_at", "updated_at")),
        entry(
            "product_correction_request",
            List.of("id", "product_id", "content", "status", "status_changed_at", "created_at")
        ),
        entry(
            "product_correction_request_image",
            List.of("image_id", "request_id", "display_order", "created_at", "updated_at")
        ),
        entry("product_daily_view", List.of("view_date", "product_id", "view_count", "created_at", "updated_at")),
        entry(
            "product_ingredient",
            List.of(
                "component_id",
                "ingredient_id",
                "display_order",
                "disclosed_amount_type",
                "value",
                "unit",
                "created_at",
                "updated_at"
            )
        ),
        entry(
            "product_request",
            List.of("id", "product_name", "brand_name", "status", "status_changed_at", "created_at")
        ),
        entry("product_skin_type", List.of("product_id", "skin_type_code", "created_at", "updated_at")),
        entry(
            "product_variant",
            List.of(
                "id",
                "product_id",
                "display_order",
                "price",
                "volume_value",
                "volume_unit",
                "status",
                "created_at",
                "updated_at"
            )
        ),
        entry("search_keyword", List.of("id", "keyword", "status", "ranking_eligible", "created_at", "updated_at")),
        entry("search_keyword_bucket", List.of("bucket_start", "keyword_key", "hit_count", "created_at", "updated_at")),
        entry("search_keyword_expression", List.of("expression_key", "keyword_id", "created_at", "updated_at")),
        entry("skin_type", List.of("code", "name", "created_at", "updated_at")),
        entry("tag", List.of("code", "category_code", "name", "created_at", "updated_at"))
    );

    private static final Map<String, List<String>> ERD_PRIMARY_KEYS = Map.ofEntries(
        entry("brand", List.of("id")),
        entry("category", List.of("id")),
        entry("curation", List.of("id")),
        entry("curation_block", List.of("id")),
        entry("curation_block_filter", List.of("id", "block_id")),
        entry("curation_block_product", List.of("block_id", "product_id")),
        entry("curation_block_product_filter", List.of("block_id", "product_id", "filter_id")),
        entry("exclude_code_ingredient", List.of("exclude_code", "ingredient_id")),
        entry("feedback", List.of("id")),
        entry("feedback_image", List.of("image_id")),
        entry("ingredient", List.of("id")),
        entry("ingredient_alias", List.of("id")),
        entry("ingredient_source", List.of("id")),
        entry("ingredient_tag", List.of("ingredient_id", "tag_code")),
        entry("product", List.of("id")),
        entry("product_component", List.of("id")),
        entry("product_correction_request", List.of("id")),
        entry("product_correction_request_image", List.of("image_id")),
        entry("product_daily_view", List.of("view_date", "product_id")),
        entry("product_ingredient", List.of("component_id", "ingredient_id")),
        entry("product_request", List.of("id")),
        entry("product_skin_type", List.of("product_id", "skin_type_code")),
        entry("product_variant", List.of("id")),
        entry("search_keyword", List.of("id")),
        entry("search_keyword_bucket", List.of("bucket_start", "keyword_key")),
        entry("search_keyword_expression", List.of("expression_key")),
        entry("skin_type", List.of("code")),
        entry("tag", List.of("code"))
    );

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void matchesEveryErdCloudTableAndColumn() {
        assertThat(baseTables()).containsExactlyInAnyOrderElementsOf(ERD_COLUMNS.keySet());
        ERD_COLUMNS
            .forEach((table, columns) -> assertThat(columnsOf(table)).as(table).containsExactlyElementsOf(columns));
    }

    @Test
    void matchesEveryErdCloudPrimaryKey() {
        ERD_PRIMARY_KEYS
            .forEach((table, columns) -> assertThat(primaryKeyOf(table)).as(table).containsExactlyElementsOf(columns));
    }

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

    private List<String> baseTables() {
        return jdbcTemplate.queryForList(
            """
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = current_schema()
                  AND table_type = 'BASE TABLE'
                ORDER BY table_name
                """,
            String.class
        );
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

    private List<String> primaryKeyOf(String tableName) {
        return jdbcTemplate.queryForList(
            """
                SELECT key_column_usage.column_name
                FROM information_schema.table_constraints
                JOIN information_schema.key_column_usage
                  ON table_constraints.constraint_schema = key_column_usage.constraint_schema
                 AND table_constraints.constraint_name = key_column_usage.constraint_name
                WHERE table_constraints.table_schema = current_schema()
                  AND table_constraints.table_name = ?
                  AND table_constraints.constraint_type = 'PRIMARY KEY'
                ORDER BY key_column_usage.ordinal_position
                """,
            String.class,
            tableName
        );
    }
}
