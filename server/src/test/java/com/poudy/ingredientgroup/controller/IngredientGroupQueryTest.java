package com.poudy.ingredientgroup.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.poudy.exception.ErrorCode;
import com.poudy.excludecode.domain.ExcludeCode;
import com.poudy.ingredientgroup.domain.IngredientBundle;
import com.poudy.ingredientgroup.domain.IngredientGroup;
import com.poudy.ingredientgroup.repository.IngredientGroupRepository;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@DisplayName("성분군 조회")
class IngredientGroupQueryTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private IngredientGroupRepository repository;

    @Test
    @DisplayName("성분군의 이름, 설명과 속한 성분을 표시 순서대로 반환한다")
    void findsGroupDetail() throws Exception {
        addCeramides();

        mockMvc.perform(get("/api/ingredient-groups/CERAMIDES"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value("CERAMIDES"))
            .andExpect(jsonPath("$.name").value("세라마이드"))
            .andExpect(jsonPath("$.description").value("피부 장벽을 구성하는 지질 성분으로 수분 손실을 막음."))
            .andExpect(jsonPath("$.ingredients[*].id").value(contains(20, 9)));
    }

    @Test
    @DisplayName("마이그레이션이 제외 성분군 외에 성분군 22개를 넣는다")
    void insertsIngredientGroupsByMigration() {
        Long count = jdbc.queryForObject(
            "select count(*) from ingredient_group where code <> all(cast(? as text[]))",
            Long.class,
            (Object) ExcludeCode.codeValues().toArray(String[]::new)
        );

        assertThat(count).isEqualTo(22);
    }

    @Test
    @DisplayName("제외 성분군도 성분군으로 조회한다")
    void findsExcludeCodeAsGroup() throws Exception {
        mockMvc.perform(get("/api/ingredient-groups/SULFATES"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.name").value("설페이트 성분"));
    }

    @Test
    @DisplayName("없는 성분군이면 404를 반환한다")
    void rejectsUnknownGroup() throws Exception {
        mockMvc.perform(get("/api/ingredient-groups/UNKNOWN"))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.code").value(ErrorCode.INGREDIENT_GROUP_NOT_FOUND.name()));
    }

    @Test
    @DisplayName("주요 성분 묶음에는 제외 성분군을 쓰지 않는다")
    void excludesExcludeCodesFromBundling() {
        List<Long> fragranceIngredients = List.of(9L, 20L);

        assertThat(repository.findBundlingGroups().bundle(fragranceIngredients))
            .extracting(IngredientBundle::group)
            .containsOnlyNulls();

        addCeramides();

        assertThat(repository.findBundlingGroups().bundle(fragranceIngredients))
            .singleElement()
            .extracting(IngredientBundle::group)
            .extracting(IngredientGroup::code)
            .isEqualTo("CERAMIDES");
    }

    private void addCeramides() {
        jdbc.update(
            "insert into ingredient_group_ingredient (group_code, ingredient_id, display_order) values (?, ?, 0), (?, ?, 1)",
            "CERAMIDES",
            20L,
            "CERAMIDES",
            9L
        );
    }
}
