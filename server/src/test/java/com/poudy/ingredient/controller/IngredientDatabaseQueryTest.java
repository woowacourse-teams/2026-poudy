package com.poudy.ingredient.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.jdbc.Sql;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@Sql("/db/search-test-data.sql")
@DisplayName("성분 API DB 조회")
class IngredientDatabaseQueryTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbc;

    @Test
    @DisplayName("DB의 정확한 별칭 일치를 이름 접두 일치보다 먼저 반환한다")
    void usesDatabaseSearchOrder() throws Exception {
        mockMvc.perform(get("/api/ingredients/suggestions").param("keyword", "계약성분"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items.length()").value(2))
            .andExpect(jsonPath("$.items[0].id").value(90002))
            .andExpect(jsonPath("$.items[0].match.field").value("ALIAS"))
            .andExpect(jsonPath("$.items[0].match.text").value("계약성분"))
            .andExpect(jsonPath("$.items[0].match.startIndex").value(0))
            .andExpect(jsonPath("$.items[0].match.endIndexExclusive").value(4))
            .andExpect(jsonPath("$.items[1].id").value(90001));
    }

    @ParameterizedTest
    @CsvSource({"PDRN,90007,0,4", "ㅍㄷㅇㅇ,90007,0,4", "검증스내일원료,90006,0,7"})
    @DisplayName("DB에서 계산한 영문·초성·오타 교정의 원문 구간을 반환한다")
    void returnsDatabaseMatchRange(String keyword, long id, int start, int end) throws Exception {
        mockMvc.perform(get("/api/ingredients/suggestions").param("keyword", keyword))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items[0].id").value(id))
            .andExpect(jsonPath("$.items[0].match.startIndex").value(start))
            .andExpect(jsonPath("$.items[0].match.endIndexExclusive").value(end));
    }

    @Test
    @DisplayName("사용 성분 조건을 적용한 뒤 요청 순서대로 페이지를 자른다")
    void filtersBeforePaging() throws Exception {
        addProductIngredients();
        mockMvc.perform(
            get("/api/ingredients")
                .param("ingredientIds", "90003,90002,90001,999999")
                .param("usedInProducts", "true").param("page", "2").param("size", "1")
        )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items.length()").value(1))
            .andExpect(jsonPath("$.items[0].id").value(90001))
            .andExpect(jsonPath("$.pagination.totalElements").value(2))
            .andExpect(jsonPath("$.pagination.hasNext").value(false));
    }

    @Test
    @DisplayName("범위를 벗어난 빈 페이지에도 존재하는 성분의 전체 개수를 반환한다")
    void countsBeyondLastPage() throws Exception {
        mockMvc.perform(
            get("/api/ingredients")
                .param("ingredientIds", "90002,90001,999999")
                .param("page", "3").param("size", "1")
        )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items.length()").value(0))
            .andExpect(jsonPath("$.pagination.totalElements").value(2));
    }

    @Test
    @DisplayName("기동 이후 저장된 상세·근거·제외 성분군과 중복을 제외한 제품 수를 조회한다")
    void readsCurrentDetail() throws Exception {
        addProductIngredients();
        jdbc.update("update ingredient set description = '수정된 설명' where id = 90002");
        jdbc.update("insert into ingredient_source values (90002, 1, '두 번째'), (90002, 0, '첫 번째')");
        jdbc.update("insert into ingredient_tag values (90002, 47, 0)");
        jdbc.update("insert into ingredient_tag_evidence values (90002, 47, 1, '근거 둘'), (90002, 47, 0, '근거 하나')");
        jdbc.update("insert into exclude_code_ingredient values ('FRAGRANCE_ALLERGENS', 90002, 90002)");

        mockMvc.perform(get("/api/ingredients/90002"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.description").value("수정된 설명"))
            .andExpect(jsonPath("$.productCount").value(2))
            .andExpect(jsonPath("$.groupCodes[0]").value("FRAGRANCE_ALLERGENS"))
            .andExpect(jsonPath("$.infoSources[0]").value("첫 번째"))
            .andExpect(jsonPath("$.infoSources[1]").value("두 번째"))
            .andExpect(jsonPath("$.skinEffects[0].id").value(47))
            .andExpect(jsonPath("$.effectSources[0]").value("근거 하나"))
            .andExpect(jsonPath("$.effectSources[1]").value("근거 둘"));
    }

    private void addProductIngredients() {
        jdbc.update(
            "insert into product_component (product_id, display_order, name)"
                + " values (90001, 0, '첫 구성품'), (90001, 1, '둘째 구성품'), (90002, 0, null)"
        );
        jdbc.update("""
            insert into product_ingredient (product_id, component_order, display_order, ingredient_id)
            values (90001, 0, 0, 90002), (90001, 1, 0, 90002), (90002, 0, 0, 90002), (90002, 0, 1, 90001)
            """);
    }
}
