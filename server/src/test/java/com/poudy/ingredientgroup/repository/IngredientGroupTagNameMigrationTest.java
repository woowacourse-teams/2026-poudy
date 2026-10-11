package com.poudy.ingredientgroup.repository;

import static org.assertj.core.api.Assertions.assertThat;

import com.poudy.excludecode.domain.ExcludeCode;
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
class IngredientGroupTagNameMigrationTest {

    @Autowired
    private JdbcTemplate jdbc;

    @Test
    @DisplayName("기존 성분군 행에 주의 태그 문구를 채우고 일반 성분군은 비워 둔다")
    void backfillsExistingCautionGroups() {
        jdbc.execute("create temporary table ingredient_group (code varchar(50) primary key) on commit drop");
        for (String code : ExcludeCode.codeValues()) {
            jdbc.update("insert into ingredient_group (code) values (?)", code);
        }
        jdbc.update("insert into ingredient_group (code) values ('CERAMIDES')");

        jdbc.execute((ConnectionCallback<Void>) connection -> {
            ScriptUtils.executeSqlScript(
                connection,
                new ClassPathResource("db/migration/V10__add_ingredient_group_tag_name.sql")
            );
            return null;
        });

        assertThat(
            jdbc.queryForList(
                "select tag_name from ingredient_group where code <> 'CERAMIDES' order by code",
                String.class
            )
        )
            .containsExactly("실리콘", "건조 알코올", "향료", "자극성 방부제", "설페이트", "합성 색소");
        assertThat(jdbc.queryForObject("select tag_name from ingredient_group where code = 'CERAMIDES'", String.class))
            .isNull();
    }
}
