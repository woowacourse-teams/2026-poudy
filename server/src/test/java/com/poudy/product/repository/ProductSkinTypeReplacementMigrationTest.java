package com.poudy.product.repository;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.ConnectionCallback;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.init.ScriptUtils;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class ProductSkinTypeReplacementMigrationTest {

    private static final String OLD_UPDATED_AT = "2000-01-01 00:00:00";

    @Autowired
    private JdbcTemplate jdbc;

    @Test
    @DisplayName("기존 피부타입을 모두 지우고 새 데이터로 바꾸며 값이 바뀐 제품만 수정 시각을 갱신한다")
    public void replacesSkinTypesAndTouchesOnlyChangedProducts() {
        jdbc.update("update product set updated_at = cast(? as timestamp), is_sensitive_skin = false", OLD_UPDATED_AT);
        jdbc.update("update product set is_sensitive_skin = true where id = 1");
        jdbc.update("insert into product_skin_type (product_id, skin_type_code) values (10, 'DRY')");

        runMigration();

        assertThat(
            jdbc.queryForList(
                """
                    select product_id || ':' || skin_type_code from product_skin_type
                    where product_id in (1, 7, 10, 13, 15) order by product_id, skin_type_code
                    """,
                String.class
            )
        )
            .containsExactly("1:DRY", "15:OILY");
        assertThat(sensitiveSkins()).containsExactly(
            Map.entry(1L, true),
            Map.entry(7L, false),
            Map.entry(10L, false),
            Map.entry(13L, false),
            Map.entry(15L, true)
        );
        assertThat(untouchedProductIds()).containsExactly(1L, 7L);
    }

    private void runMigration() {
        jdbc.execute((ConnectionCallback<Void>) connection -> {
            ScriptUtils.executeSqlScript(
                connection,
                new ClassPathResource("db/migration/V24__replace_product_skin_types.sql")
            );
            return null;
        });
    }

    private List<Map.Entry<Long, Boolean>> sensitiveSkins() {
        return jdbc.query(
            "select id, is_sensitive_skin from product where id in (1, 7, 10, 13, 15) order by id",
            (row, rowNum) -> Map.entry(row.getLong("id"), row.getBoolean("is_sensitive_skin"))
        );
    }

    private List<Long> untouchedProductIds() {
        return jdbc.queryForList(
            "select id from product where id in (1, 7, 10, 13, 15) and updated_at = cast(? as timestamp) order by id",
            Long.class,
            OLD_UPDATED_AT
        );
    }
}
